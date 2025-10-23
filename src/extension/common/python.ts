// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/naming-convention */
import { Environment, EnvironmentPath, ResolvedEnvironment, Resource } from '@vscode/python-extension';
import { commands, EventEmitter, extensions, Uri, Event, Disposable } from 'vscode';
import { traceError, traceLog, traceWarn } from './log/logging';
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

/**
 * Details about a Python interpreter.
 */
export interface IInterpreterDetails {
    /** Array of path components to the Python executable */
    path?: string[];
    /** The workspace resource associated with this interpreter */
    resource?: Uri;
}

/** Event emitter for Python interpreter changes */
const onDidChangePythonInterpreterEvent = new EventEmitter<IInterpreterDetails>();

/** Event that fires when the active Python interpreter changes */
export const onDidChangePythonInterpreter: Event<IInterpreterDetails> = onDidChangePythonInterpreterEvent.event;

async function activateExtensions() {
    traceWarn('Value during activateExtensions of useEnvExtension(): ', useEnvExtension());
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
    if (!useEnvExtension()) {
        await legacyInitializePython(disposables, onDidChangePythonInterpreterEvent);
    } else {
        try {
            const api = await getPythonEnvironmentExtensionAPI();
            if (api) {
                disposables.push(
                    api.onDidChangeEnvironments(async () => {
                        // not sure if this is the right event....
                        onDidChangePythonInterpreterEvent.fire(await getInterpreterDetails());
                        traceLog('Python environments changed.');
                    }),
                );

                traceLog('Waiting for interpreter from python environments extension.');
                onDidChangePythonInterpreterEvent.fire(await getInterpreterDetails());
            }
        } catch (error) {
            traceError('Error initializing python: ', error);
        }
    }
}

export async function runPythonExtensionCommand(command: string, ...rest: any[]) {
    await activateExtensions();
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
            return undefined;
        }

        // Resolve environment if execution info is not available
        if (!pyEnv.execInfo) {
            pyEnv = await api.resolveEnvironment(pyEnv.environmentPath);
        }

        // Extract execution command from resolved environment
        const execInfo = pyEnv?.execInfo;
        if (!execInfo) {
            return undefined;
        }

        const runConfig = execInfo.activatedRun ?? execInfo.run;
        return runConfig.args ? [runConfig.executable, ...runConfig.args] : [runConfig.executable];
    }
} // should I make this more async? rn it just becomes sync

export async function getEnvironmentVariables(resource?: Resource) {
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
            // Should return undefined for invalid environment
            return undefined;
        }
        if (legacyResolvedEnv) {
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
            return api.resolveEnvironment(Uri.file(env));
        } else if (typeof env === 'object' && 'path' in env) {
            // EnvironmentPath has a uri property
            return api.resolveEnvironment(Uri.file(env.path));
        } else {
            return undefined;
        }
    }
}

export async function getActiveEnvironmentPath(
    resource?: Resource,
): Promise<PythonEnvironment | EnvironmentPath | undefined> {
    // if I add environmentPath. or there needs to be some conversion between the two here
    //TODO: fix this return type??
    if (!useEnvExtension()) {
        const envPath: EnvironmentPath = await legacyGetActiveEnvironmentPath(resource);
        return envPath;
    } else {
        const api = await getPythonEnvironmentExtensionAPI();

        // Convert resource to Uri | undefined from Resource | undefined
        const resourceUri =
            resource instanceof Uri ? resource : resource && 'uri' in resource ? resource.uri : undefined;

        const env = await api.getEnvironment(resourceUri);
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
        const executablePath = resolvedEnv?.execInfo.activatedRun?.executable
            ? resolvedEnv.execInfo.activatedRun.executable
            : resolvedEnv?.execInfo.run.executable;

        const a: IInterpreterDetails = {
            path: executablePath ? [executablePath] : undefined,
            resource,
        };
        return a;
    }
}
