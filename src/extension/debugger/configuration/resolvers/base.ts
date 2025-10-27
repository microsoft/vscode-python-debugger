// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as path from 'path';
import { CancellationToken, DebugConfiguration, Uri, WorkspaceFolder } from 'vscode';
import { sendTelemetryEvent } from '../../../telemetry';
import { EventName } from '../../../telemetry/constants';
import { DebuggerTelemetry } from '../../../telemetry/types';
import { getWorkspaceFolders, getWorkspaceFolder as getVSCodeWorkspaceFolder } from '../../../common/vscodeapi';
import { AttachRequestArguments, DebugOptions, LaunchRequestArguments, PathMapping } from '../../../types';
import { PythonPathSource } from '../../types';
import { IDebugConfigurationResolver } from '../types';
import { resolveWorkspaceVariables } from '../utils/common';
import { getProgram } from './helper';
import { getSettingsPythonPath, getInterpreterDetails } from '../../../common/python';
import { getOSType, OSType } from '../../../common/platform';
import { traceLog } from '../../../common/log/logging';

export abstract class BaseConfigurationResolver<T extends DebugConfiguration>
    implements IDebugConfigurationResolver<T>
{
    protected pythonPathSource: PythonPathSource = PythonPathSource.launchJson;

    constructor() {}

    // This is a legacy hook used solely for backwards-compatible manual substitution
    // of ${command:python.interpreterPath} in "pythonPath", for the sake of other
    // existing implementations of resolveDebugConfiguration() that may rely on it.
    //
    // For all future config variables, expansion should be performed by VSCode itself,
    // and validation of debug configuration in derived classes should be performed in
    // resolveDebugConfigurationWithSubstitutedVariables() instead, where all variables
    // are already substituted.
    // eslint-disable-next-line class-methods-use-this
    public async resolveDebugConfiguration(
        _folder: WorkspaceFolder | undefined,
        debugConfiguration: DebugConfiguration,
        _token?: CancellationToken,
    ): Promise<T | undefined> {
        if (!debugConfiguration.clientOS) {
            debugConfiguration.clientOS = getOSType() === OSType.Windows ? 'windows' : 'unix';
        }
        if (debugConfiguration.consoleName) {
            debugConfiguration.consoleTitle = debugConfiguration.consoleName;
            delete debugConfiguration.consoleName;
        }
        return debugConfiguration as T;
    }

    public abstract resolveDebugConfigurationWithSubstitutedVariables(
        folder: WorkspaceFolder | undefined,
        debugConfiguration: DebugConfiguration,
        token?: CancellationToken,
    ): Promise<T | undefined>;

    protected static getWorkspaceFolder(folder: WorkspaceFolder | undefined): Uri | undefined {
        if (folder) {
            return folder.uri;
        }
        const program = getProgram();
        const workspaceFolders = getWorkspaceFolders();

        if (!Array.isArray(workspaceFolders) || workspaceFolders.length === 0) {
            traceLog('No workspace folder found');
            return program ? Uri.file(path.dirname(program)) : undefined;
        }
        if (workspaceFolders.length === 1) {
            traceLog('Using the only workspaceFolder found: ', workspaceFolders[0].uri.fsPath);
            return workspaceFolders[0].uri;
        }
        if (program) {
            const workspaceFolder = getVSCodeWorkspaceFolder(Uri.file(program));
            if (workspaceFolder) {
                traceLog('Using workspaceFolder found for the program: ', workspaceFolder.uri.fsPath);
                return workspaceFolder.uri;
            }
        }
        return undefined;
    }

    /**
     * Resolves and updates file paths and Python interpreter paths in the debug configuration.
     *
     * This method performs two main operations:
     * 1. Resolves workspace variables in the envFile path (if specified)
     * 2. Resolves and updates Python interpreter paths, handling legacy pythonPath deprecation
     *
     * @param workspaceFolder The workspace folder URI for variable resolution
     * @param debugConfiguration The launch configuration to update
     */
    protected async resolveAndUpdatePaths(
        workspaceFolder: Uri | undefined,
        debugConfiguration: LaunchRequestArguments,
    ): Promise<void> {
        BaseConfigurationResolver.resolveAndUpdateEnvFilePath(workspaceFolder, debugConfiguration);
        await this.resolveAndUpdatePythonPath(workspaceFolder, debugConfiguration);
    }

    /**
     * Resolves workspace variables in the envFile path.
     *
     * Expands variables like ${workspaceFolder} in the envFile configuration using the
     * workspace folder path or current working directory as the base for resolution.
     *
     * @param workspaceFolder The workspace folder URI for variable resolution
     * @param debugConfiguration The launch configuration containing the envFile path
     */
    protected static resolveAndUpdateEnvFilePath(
        workspaceFolder: Uri | undefined,
        debugConfiguration: LaunchRequestArguments,
    ): void {
        // Early exit if no configuration or no envFile to resolve
        if (!debugConfiguration?.envFile) {
            return;
        }

        const basePath = workspaceFolder?.fsPath || debugConfiguration.cwd;

        if (basePath) {
            // update envFile with resolved variables
            debugConfiguration.envFile = resolveWorkspaceVariables(debugConfiguration.envFile, basePath, undefined);
        }
    }

    /**
     * Resolves Python interpreter paths.
     *
     * @param workspaceFolder The workspace folder URI for variable resolution and interpreter detection
     * @param debugConfiguration The launch configuration to update with resolved Python paths
     */
    protected async resolveAndUpdatePythonPath(
        workspaceFolder: Uri | undefined,
        debugConfiguration: LaunchRequestArguments,
    ): Promise<void> {
        if (!debugConfiguration) {
            return;
        }

        // get the interpreter details in the context of the workspace folder
        const interpreterDetail = await getInterpreterDetails(workspaceFolder);
        const interpreterPath = interpreterDetail?.path ?? (await getSettingsPythonPath(workspaceFolder));
        const resolvedInterpreterPath = interpreterPath ? interpreterPath[0] : interpreterPath;

        traceLog(
            `resolveAndUpdatePythonPath - Initial state: ` +
                `python='${debugConfiguration.python}', ` +
                `debugAdapterPython='${debugConfiguration.debugAdapterPython}', ` +
                `debugLauncherPython='${debugConfiguration.debugLauncherPython}', ` +
                `workspaceFolder='${workspaceFolder?.fsPath}'` +
                `resolvedInterpreterPath='${resolvedInterpreterPath}'`,
        );

        // Resolve current python property
        if (debugConfiguration.python === '${command:python.interpreterPath}' || !debugConfiguration.python) {
            // if python is set to the command or undefined, resolve it
            this.pythonPathSource = PythonPathSource.settingsJson;
            debugConfiguration.python = resolvedInterpreterPath;
        } else {
            // User provided explicit python path in launch.json
            this.pythonPathSource = PythonPathSource.launchJson;
            debugConfiguration.python = resolveWorkspaceVariables(
                debugConfiguration.python,
                workspaceFolder?.fsPath,
                undefined,
            );
        }

        // Set debug adapter and launcher Python paths
        this.setDebugComponentPythonPaths(debugConfiguration);
    }

    /**
     * Sets debugAdapterPython and debugLauncherPython.
     *
     * @param debugConfiguration The debug configuration to update
     */
    private setDebugComponentPythonPaths(debugConfiguration: LaunchRequestArguments): void {
        const shouldSetDebugAdapter =
            debugConfiguration.debugAdapterPython === '${command:python.interpreterPath}' ||
            debugConfiguration.debugAdapterPython === undefined;

        const shouldSetDebugLauncher =
            debugConfiguration.debugLauncherPython === '${command:python.interpreterPath}' ||
            debugConfiguration.debugLauncherPython === undefined;

        if (shouldSetDebugAdapter) {
            debugConfiguration.debugAdapterPython = debugConfiguration.python;
        }
        if (shouldSetDebugLauncher) {
            debugConfiguration.debugLauncherPython = debugConfiguration.python;
        }
    }

    protected static debugOption(debugOptions: DebugOptions[], debugOption: DebugOptions): void {
        if (debugOptions.indexOf(debugOption) >= 0) {
            return;
        }
        debugOptions.push(debugOption);
    }

    protected static isLocalHost(hostName?: string): boolean {
        const localHosts = ['localhost', '127.0.0.1', '::1'];
        return !!(hostName && localHosts.indexOf(hostName.toLowerCase()) >= 0);
    }

    protected static fixUpPathMappings(
        pathMappings: PathMapping[],
        defaultLocalRoot?: string,
        defaultRemoteRoot?: string,
    ): PathMapping[] {
        if (!defaultLocalRoot) {
            return [];
        }
        if (!defaultRemoteRoot) {
            defaultRemoteRoot = defaultLocalRoot;
        }

        if (pathMappings.length === 0) {
            pathMappings = [
                {
                    localRoot: defaultLocalRoot,
                    remoteRoot: defaultRemoteRoot,
                },
            ];
        } else {
            // Expand ${workspaceFolder} variable first if necessary.
            pathMappings = pathMappings.map(({ localRoot: mappedLocalRoot, remoteRoot }) => {
                const resolvedLocalRoot = resolveWorkspaceVariables(mappedLocalRoot, defaultLocalRoot, undefined);
                return {
                    localRoot: resolvedLocalRoot || '',
                    // TODO: Apply to remoteRoot too?
                    remoteRoot,
                };
            });
        }

        // If on Windows, lowercase the drive letter for path mappings.
        // TODO: Apply even if no localRoot?
        if (getOSType() === OSType.Windows) {
            // TODO: Apply to remoteRoot too?
            pathMappings = pathMappings.map(({ localRoot: windowsLocalRoot, remoteRoot }) => {
                let localRoot = windowsLocalRoot;
                if (windowsLocalRoot.match(/^[A-Z]:/)) {
                    localRoot = `${windowsLocalRoot[0].toLowerCase()}${windowsLocalRoot.substr(1)}`;
                }
                return { localRoot, remoteRoot };
            });
        }

        return pathMappings;
    }

    protected static isDebuggingFastAPI(
        debugConfiguration: Partial<LaunchRequestArguments & AttachRequestArguments>,
    ): boolean {
        return !!(debugConfiguration.module && debugConfiguration.module.toUpperCase() === 'FASTAPI');
    }

    protected static isDebuggingFlask(
        debugConfiguration: Partial<LaunchRequestArguments & AttachRequestArguments>,
    ): boolean {
        return !!(debugConfiguration.module && debugConfiguration.module.toUpperCase() === 'FLASK');
    }

    protected static sendTelemetry(
        trigger: 'launch' | 'attach' | 'test',
        debugConfiguration: Partial<LaunchRequestArguments & AttachRequestArguments>,
    ): void {
        const name = debugConfiguration.name || '';
        const moduleName = debugConfiguration.module || '';
        const telemetryProps: DebuggerTelemetry = {
            trigger,
            console: debugConfiguration.console,
            hasEnvVars: typeof debugConfiguration.env === 'object' && Object.keys(debugConfiguration.env).length > 0,
            django: !!debugConfiguration.django,
            fastapi: BaseConfigurationResolver.isDebuggingFastAPI(debugConfiguration),
            flask: BaseConfigurationResolver.isDebuggingFlask(debugConfiguration),
            hasArgs: Array.isArray(debugConfiguration.args) && debugConfiguration.args.length > 0,
            isLocalhost: BaseConfigurationResolver.isLocalHost(debugConfiguration.host),
            isModule: moduleName.length > 0,
            isSudo: !!debugConfiguration.sudo,
            jinja: !!debugConfiguration.jinja,
            pyramid: !!debugConfiguration.pyramid,
            stopOnEntry: !!debugConfiguration.stopOnEntry,
            showReturnValue: !!debugConfiguration.showReturnValue,
            subProcess: !!debugConfiguration.subProcess,
            autoStartBrowser: !!debugConfiguration,
            watson: name.toLowerCase().indexOf('watson') >= 0,
            pyspark: name.toLowerCase().indexOf('pyspark') >= 0,
            gevent: name.toLowerCase().indexOf('gevent') >= 0,
            scrapy: moduleName.toLowerCase() === 'scrapy',
        };
        sendTelemetryEvent(EventName.DEBUGGER, undefined, telemetryProps);
    }
}
