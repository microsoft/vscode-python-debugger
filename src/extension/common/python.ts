// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/naming-convention */
import { Environment, EnvironmentPath, ResolvedEnvironment, Resource } from '@vscode/python-extension';
import { commands, EventEmitter, extensions, Uri, Event, Disposable, Extension } from 'vscode';
import { traceError, traceLog } from './log/logging';
import { PythonEnvironment, PythonEnvironmentApi, PythonEnvsExtension } from '../envExtApi';
import {
    legacyGetActiveEnvironmentPath,
    legacyGetEnvironmentVariables,
    legacyGetInterpreterDetails,
    legacyGetSettingsPythonPath,
    legacyInitializePython,
    legacyResolveEnvironment,
} from './legacyPython';
import { useEnvExtension } from './utilities';
import { EnvironmentVariables } from './variables/types';

export interface IInterpreterDetails {
    path?: string[];
    resource?: Uri;
}

/** Event emitter for Python interpreter changes */
const onDidChangePythonInterpreterEvent = new EventEmitter<IInterpreterDetails>();

export const onDidChangePythonInterpreter: Event<IInterpreterDetails> = onDidChangePythonInterpreterEvent.event;

async function activateExtensions() {
    traceLog('Value during activateExtensions of useEnvExtension(): ', useEnvExtension());
    await activatePythonExtension();
    await activateEnvsExtension();
}

async function activatePythonExtension() {
    const extension = extensions.getExtension('ms-python.python');
    if (extension) {
        if (!extension.isActive) {
            console.log('Activating Python extension...');
            await extension.activate();
        }
    }
    return extension;
}
/**
 * Activates the Python environments extension.
 * @returns The activated Python environments extension instance
 */
async function activateEnvsExtension(): Promise<Extension<any> | undefined> {
    const extension = extensions.getExtension('ms-python.vscode-python-envs');
    if (extension) {
        if (!extension.isActive) {
            console.log('Activating Python Environments extension...');
            await extension.activate();
        }
    }
    return extension;
}

export async function getPythonEnvironmentExtensionAPI(): Promise<PythonEnvironmentApi> {
    await activateEnvsExtension();
    return await PythonEnvsExtension.api();
}

export async function initializePython(disposables: Disposable[]): Promise<void> {
    traceLog(`initializePython: usingEnvExt='${useEnvExtension()}'`);
    if (!useEnvExtension()) {
        await legacyInitializePython(disposables, onDidChangePythonInterpreterEvent);
    } else {
        try {
            const api = await getPythonEnvironmentExtensionAPI();
            if (api) {
                disposables.push(
                    api.onDidChangeEnvironments(async () => {
                        const details = await getInterpreterDetails();
                        traceLog(`initializePython:onDidChangeEnvironments fired executable='${details.path?.[0]}'`);
                        onDidChangePythonInterpreterEvent.fire(details);
                        traceLog('Python environments changed event processed.');
                    }),
                );

                traceLog('Waiting for interpreter from python environments extension.');
                onDidChangePythonInterpreterEvent.fire(await getInterpreterDetails());
                traceLog('initializePython: Initial interpreter details fired (env extension path)');
            }
        } catch (error) {
            traceError('Error initializing python: ', error);
        }
    }
}

export async function runPythonExtensionCommand(command: string, ...rest: any[]) {
    await activateExtensions();
    traceLog(`runPythonExtensionCommand: executing command='${command}' argsCount='${rest.length}'`);
    return await commands.executeCommand(command, ...rest);
}

/**
 * Returns all the details needed to execute code within the selected environment,
 * corresponding to the specified resource taking into account any workspace-specific settings
 * for the workspace to which this resource belongs.
 * @param resource Optional workspace resource to get settings for
 * @returns Array of command components or undefined if not available
 */
export async function getSettingsPythonPath(resource?: Uri): Promise<string[] | undefined> {
    // this one is only called if getInterpreterDetails(workspaceFolder) doesn't return somethinig with r.path
    if (!useEnvExtension()) {
        return legacyGetSettingsPythonPath(resource);
    } else {
        const api = await getPythonEnvironmentExtensionAPI();
        let pyEnv = await api.getEnvironment(resource);

        if (!pyEnv) {
            traceLog(`getSettingsPythonPath: No environment for resource='${resource?.fsPath}'`);
            return undefined;
        }

        // Resolve environment if execution info is not available
        if (!pyEnv.execInfo) {
            pyEnv = await api.resolveEnvironment(pyEnv.environmentPath);
            traceLog(
                `getSettingsPythonPath: Resolved environment execInfo for '${
                    pyEnv?.environmentPath.fsPath || 'undefined'
                }'`,
            );
        }

        // Extract execution command from resolved environment
        const execInfo = pyEnv?.execInfo;
        if (!execInfo) {
            traceLog('getSettingsPythonPath: Missing execInfo after resolution');
            return undefined;
        }

        const runConfig = execInfo.run;
        traceLog(
            `getSettingsPythonPath: Using executable='${runConfig.executable}' args='${
                runConfig.args?.join(' ') || ''
            }'`,
        );
        return runConfig.args ? [runConfig.executable, ...runConfig.args] : [runConfig.executable];
    }
} // should I make this more async? rn it just becomes sync

export async function getEnvironmentVariables(resource?: Resource): Promise<EnvironmentVariables> {
    if (!useEnvExtension()) {
        return legacyGetEnvironmentVariables(resource);
    } else {
        const api = await getPythonEnvironmentExtensionAPI();

        // Convert resource to Uri or undefined
        const resourceUri =
            resource instanceof Uri ? resource : resource && 'uri' in resource ? resource.uri : undefined;

        return api.getEnvironmentVariables(resourceUri);
    }
}

export async function resolveEnvironment(
    env: Environment | EnvironmentPath | string,
): Promise<PythonEnvironment | undefined> {
    if (!useEnvExtension()) {
        const legacyResolvedEnv: ResolvedEnvironment | undefined = await legacyResolveEnvironment(env);
        // if its a legacy path, convert to new python environment
        const pythonVersion = legacyResolvedEnv?.version
            ? `${legacyResolvedEnv.version.major}.${legacyResolvedEnv.version.minor}.${legacyResolvedEnv.version.micro}`
            : 'Unknown';
        const execUri = legacyResolvedEnv?.executable.uri;
        if (execUri === undefined) {
            traceLog('resolveEnvironment: legacy path invalid (no executable uri)');
            // Should return undefined for invalid environment
            return undefined;
        }
        if (legacyResolvedEnv) {
            traceLog(`resolveEnvironment: legacy resolved executable='${execUri.fsPath}' version='${pythonVersion}'`);
            const pythonEnv: PythonEnvironment = {
                envId: {
                    id: execUri.fsPath,
                    managerId: legacyResolvedEnv.environment?.type ?? 'Venv',
                },
                name: legacyResolvedEnv.environment?.name ?? `Python ${pythonVersion ?? 'Unknown'}`,
                displayName: legacyResolvedEnv.environment?.name ?? `Python ${pythonVersion ?? 'Unknown'}`,
                displayPath: execUri.fsPath,
                version: pythonVersion,
                environmentPath: execUri,
                execInfo: {
                    run: {
                        executable: execUri.fsPath,
                        args: [],
                    },
                },
                sysPrefix: legacyResolvedEnv.executable.sysPrefix ?? '',
            };
            return pythonEnv;
        }
    } else {
        const api = await getPythonEnvironmentExtensionAPI();

        // Handle different input types for the new API
        if (typeof env === 'string') {
            // Convert string path to Uri for the new API
            traceLog(`resolveEnvironment: new API resolving from string='${env}'`);
            return api.resolveEnvironment(Uri.file(env));
        } else if (typeof env === 'object' && 'path' in env) {
            // EnvironmentPath has a uri property
            traceLog(`resolveEnvironment: new API resolving from EnvironmentPath='${env.path}'`);
            return api.resolveEnvironment(Uri.file(env.path));
        } else {
            traceLog('resolveEnvironment: new API unsupported env input');
            return undefined;
        }
    }
}

export async function getActiveEnvironmentPath(
    resource?: Resource,
): Promise<PythonEnvironment | EnvironmentPath | undefined> {
    if (!useEnvExtension()) {
        const envPath: EnvironmentPath = await legacyGetActiveEnvironmentPath(resource);
        traceLog(`getActiveEnvironmentPath: legacy active path='${envPath.path}'`);
        return envPath;
    } else {
        const api = await getPythonEnvironmentExtensionAPI();

        // Convert resource to Uri | undefined from Resource | undefined
        const resourceUri =
            resource instanceof Uri ? resource : resource && 'uri' in resource ? resource.uri : undefined;

        const env = await api.getEnvironment(resourceUri);
        traceLog(
            `getActiveEnvironmentPath: new API envPath='${env?.environmentPath.fsPath}' resource='${resourceUri?.fsPath}'`,
        );
        return env;
    }
}

/**
 * Gets Python interpreter details using the Python Envs extension API.
 *
 * This function retrieves the active Python environment for a given resource using the
 * legacy @vscode/python-extension API. It resolves the environment to get the executable
 * path and handles path quoting for paths containing spaces.
 *
 * @param resource Optional URI to specify the workspace/folder context for interpreter selection
 * @returns Promise resolving to interpreter details containing the executable path and resource
 */
export async function getInterpreterDetails(resource?: Uri): Promise<IInterpreterDetails> {
    if (!useEnvExtension()) {
        return legacyGetInterpreterDetails(resource);
    } else {
        const api = await getPythonEnvironmentExtensionAPI();

        // A promise that resolves to the current Python environment, or undefined if none is set.
        const env: PythonEnvironment | undefined = await api.getEnvironment(resource);
        // resolve the environment to get full details
        const resolvedEnv = env ? await api.resolveEnvironment(env?.environmentPath) : undefined;
        const executablePath = resolvedEnv?.execInfo.run.executable;

        const a: IInterpreterDetails = {
            path: executablePath ? [executablePath] : undefined,
            resource,
        };
        traceLog(`getInterpreterDetails: resource='${resource?.fsPath}' executable='${executablePath}'`);
        return a;
    }
}
