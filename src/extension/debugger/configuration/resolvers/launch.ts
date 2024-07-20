// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { CancellationToken, Uri, WorkspaceFolder } from 'vscode';
import { getOSType, OSType } from '../../../common/platform';
import { getEnvFile } from '../../../common/settings';
import { DebuggerTypeName } from '../../../constants';
import { DebugOptions, DebugPurpose, LaunchRequestArguments } from '../../../types';
import { resolveVariables } from '../utils/common';
import { BaseConfigurationResolver } from './base';
import { getDebugEnvironmentVariables, getProgram } from './helper';
import { getConfiguration } from '../../../common/vscodeapi';
import { traceLog } from '../../../common/log/logging';

export class LaunchConfigurationResolver extends BaseConfigurationResolver<LaunchRequestArguments> {
    public async resolveDebugConfiguration(
        folder: WorkspaceFolder | undefined,
        debugConfiguration: LaunchRequestArguments,
        _token?: CancellationToken,
    ): Promise<LaunchRequestArguments | undefined> {
        if (
            debugConfiguration.name === undefined &&
            debugConfiguration.type === undefined &&
            debugConfiguration.request === undefined &&
            debugConfiguration.program === undefined &&
            debugConfiguration.env === undefined
        ) {
            const defaultProgram = getProgram();
            debugConfiguration.name = 'Launch';
            debugConfiguration.type = DebuggerTypeName;
            debugConfiguration.request = 'launch';
            debugConfiguration.program = defaultProgram ?? '';
            debugConfiguration.env = {};
        }

        const workspaceFolder = LaunchConfigurationResolver.getWorkspaceFolder(folder);
        await this.resolveAndUpdatePaths(workspaceFolder, debugConfiguration);
        if (debugConfiguration.clientOS === undefined) {
            debugConfiguration.clientOS = getOSType() === OSType.Windows ? 'windows' : 'unix';
        }
        if (debugConfiguration.consoleName) {
            debugConfiguration.consoleTitle = debugConfiguration.consoleName;
            delete debugConfiguration.consoleName;
        }
        return debugConfiguration;
    }

    public async resolveDebugConfigurationWithSubstitutedVariables(
        folder: WorkspaceFolder | undefined,
        debugConfiguration: LaunchRequestArguments,
        _token?: CancellationToken,
    ): Promise<LaunchRequestArguments | undefined> {
        traceLog('Resolving launch configuration with substituted variables');
        const workspaceFolder = LaunchConfigurationResolver.getWorkspaceFolder(folder);
        await this.provideLaunchDefaults(workspaceFolder, debugConfiguration);

        if (Array.isArray(debugConfiguration.debugOptions)) {
            debugConfiguration.debugOptions = debugConfiguration.debugOptions!.filter(
                (item, pos) => debugConfiguration.debugOptions!.indexOf(item) === pos,
            );
        }
        return debugConfiguration;
    }

    protected async provideLaunchDefaults(
        workspaceFolder: Uri | undefined,
        debugConfiguration: LaunchRequestArguments,
    ): Promise<void> {
        if (debugConfiguration.python === undefined) {
            debugConfiguration.python = debugConfiguration.pythonPath;
        }
        if (debugConfiguration.debugAdapterPython === undefined) {
            debugConfiguration.debugAdapterPython = debugConfiguration.pythonPath;
        }
        if (debugConfiguration.debugLauncherPython === undefined) {
            debugConfiguration.debugLauncherPython = debugConfiguration.pythonPath;
        }
        delete debugConfiguration.pythonPath;

        if (typeof debugConfiguration.cwd !== 'string' && workspaceFolder) {
            debugConfiguration.cwd = workspaceFolder.fsPath;
        }
        if (typeof debugConfiguration.envFile !== 'string' && workspaceFolder) {
            debugConfiguration.envFile = resolveVariables(
                getEnvFile('python', workspaceFolder),
                workspaceFolder.fsPath,
                undefined,
            );
        }
        // Extract environment variables from .env file in the vscode context and
        // set the "env" debug configuration argument. This expansion should be
        // done here before handing of the environment settings to the debug adapter
        debugConfiguration.env = await getDebugEnvironmentVariables(debugConfiguration);

        if (typeof debugConfiguration.stopOnEntry !== 'boolean') {
            debugConfiguration.stopOnEntry = false;
        }
        debugConfiguration.showReturnValue = debugConfiguration.showReturnValue !== false;
        if (!debugConfiguration.console) {
            debugConfiguration.console = 'integratedTerminal';
        }
        // If using a terminal, then never open internal console.
        if (debugConfiguration.console !== 'internalConsole' && !debugConfiguration.internalConsoleOptions) {
            debugConfiguration.internalConsoleOptions = 'neverOpen';
        }
        if (!Array.isArray(debugConfiguration.debugOptions)) {
            debugConfiguration.debugOptions = [];
        }
        if (debugConfiguration.justMyCode === undefined) {
            debugConfiguration.justMyCode = getConfiguration('debugpy', workspaceFolder).get<boolean>(
                'debugJustMyCode',
                true,
            );
        }
        // Pass workspace folder so we can get this when we get debug events firing.
        debugConfiguration.workspaceFolder = workspaceFolder ? workspaceFolder.fsPath : undefined;
        const debugOptions = debugConfiguration.debugOptions!;
        if (debugConfiguration.stopOnEntry) {
            LaunchConfigurationResolver.debugOption(debugOptions, DebugOptions.StopOnEntry);
        }
        if (debugConfiguration.showReturnValue) {
            LaunchConfigurationResolver.debugOption(debugOptions, DebugOptions.ShowReturnValue);
        }
        if (debugConfiguration.django) {
            LaunchConfigurationResolver.debugOption(debugOptions, DebugOptions.Django);
        }
        if (debugConfiguration.jinja) {
            LaunchConfigurationResolver.debugOption(debugOptions, DebugOptions.Jinja);
        }
        if (debugConfiguration.redirectOutput === undefined && debugConfiguration.console === 'internalConsole') {
            debugConfiguration.redirectOutput = true;
        }
        if (debugConfiguration.redirectOutput) {
            LaunchConfigurationResolver.debugOption(debugOptions, DebugOptions.RedirectOutput);
        }
        if (debugConfiguration.sudo) {
            LaunchConfigurationResolver.debugOption(debugOptions, DebugOptions.Sudo);
        }
        if (debugConfiguration.subProcess === true) {
            LaunchConfigurationResolver.debugOption(debugOptions, DebugOptions.SubProcess);
        }
        if (getOSType() === OSType.Windows) {
            LaunchConfigurationResolver.debugOption(debugOptions, DebugOptions.FixFilePathCase);
        }
        const isFastAPI = LaunchConfigurationResolver.isDebuggingFastAPI(debugConfiguration);
        const isFlask = LaunchConfigurationResolver.isDebuggingFlask(debugConfiguration);
        if (debugConfiguration.autoStartBrowser && (debugConfiguration.django || isFlask)) {
            debugConfiguration.serverReadyAction = {
                pattern: '.*(https?:\\/\\/\\S+:[0-9]+\\/?).*',
                uriFormat: '%s',
                action: 'openExternally',
            };
        }
        if (
            (debugConfiguration.pyramid || isFlask || isFastAPI) &&
            debugOptions.indexOf(DebugOptions.Jinja) === -1 &&
            debugConfiguration.jinja !== false
        ) {
            LaunchConfigurationResolver.debugOption(debugOptions, DebugOptions.Jinja);
        }
        // Unlike with attach, we do not set a default path mapping.
        // (See: https://github.com/microsoft/vscode-python/issues/3568)
        if (debugConfiguration.pathMappings) {
            let { pathMappings } = debugConfiguration;
            if (pathMappings.length > 0) {
                pathMappings = LaunchConfigurationResolver.fixUpPathMappings(
                    pathMappings || [],
                    workspaceFolder ? workspaceFolder.fsPath : '',
                );
            }
            debugConfiguration.pathMappings = pathMappings.length > 0 ? pathMappings : undefined;
        }
        const trigger =
            debugConfiguration.purpose?.includes(DebugPurpose.DebugTest) || debugConfiguration.request === 'test'
                ? 'test'
                : 'launch';
        LaunchConfigurationResolver.sendTelemetry(trigger, debugConfiguration);
    }
}
