// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/naming-convention */
import {
    ActiveEnvironmentPathChangeEvent,
    Environment,
    EnvironmentPath,
    EnvironmentVariables,
    PythonExtension,
    ResolvedEnvironment,
    Resource,
} from '@vscode/python-extension';
import { commands, EventEmitter, extensions, Uri, Event, Disposable } from 'vscode';
import { traceError, traceLog } from './log/logging';
import { PythonEnvironment, PythonEnvironmentApi, PythonEnvsExtension } from '../envExtApi';

// interface IExtensionApi {
//     ready: Promise<void>;
//     settings: {
//         getExecutionDetails(resource?: Resource): { execCommand: string[] | undefined };
//     };
// }

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
/**
 * Activates the Python extension and ensures it's ready for use.
 * @returns The activated Python extension instance
 */
async function activateExtension(): Promise<Extension<any> | undefined> {
    console.log('Activating Python extension...');
    activateEnvsExtension();
    const extension = extensions.getExtension('ms-python.python');
    if (extension) {
        if (!extension.isActive) {
            await extension.activate();
        }
    }
    console.log('Python extension activated.');
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
            await extension.activate();
        }
    }
    return extension;
}

async function getPythonEnviromentExtensionAPI(): Promise<PythonEnvironmentApi> {
    // Load the Python extension API
    await activateEnvsExtension();
    return await PythonEnvsExtension.api();
}

// async function getLegacyPythonExtensionAPI(): Promise<IExtensionApi | undefined> {
//     const extension = await activateExtension();
//     return extension?.exports as IExtensionApi;
// }

async function getLegacyPythonExtensionEnviromentAPI(): Promise<PythonExtension> {
    // Load the Python extension API
    await activateExtension();
    return await PythonExtension.api();
}

/**
 * Initializes Python integration by setting up event listeners and getting initial interpreter details.
 * @param disposables Array to store disposable resources for cleanup
 */
export async function initializePython(disposables: Disposable[]): Promise<void> {
    try {
        const api = await getLegacyPythonExtensionEnviromentAPI();

        if (api) {
            disposables.push(
                //  This event is triggered when the active environment setting changes.
                api.environments.onDidChangeActiveEnvironmentPath((e: ActiveEnvironmentPathChangeEvent) => {
                    let resourceUri: Uri | undefined;
                    if (e.resource instanceof Uri) {
                        resourceUri = e.resource;
                    }
                    if (e.resource && 'uri' in e.resource) {
                        // WorkspaceFolder type
                        resourceUri = e.resource.uri;
                    }
                    onDidChangePythonInterpreterEvent.fire({ path: [e.path], resource: resourceUri });
                }),
            );

            traceLog('Waiting for interpreter from python extension.');
            onDidChangePythonInterpreterEvent.fire(await getInterpreterDetails());
        }
    } catch (error) {
        traceError('Error initializing python: ', error);
    }
}

/**
 * Executes a command from the Python extension.
 * @param command The command identifier to execute
 * @param rest Additional arguments to pass to the command
 * @returns The result of the command execution
 */
export async function runPythonExtensionCommand(command: string, ...rest: any[]): Promise<any> {
    await activateExtension();
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
    // const api = await getLegacyPythonExtensionAPI();
    // return api?.settings.getExecutionDetails(resource).execCommand;

    const apiNew = await getPythonEnviromentExtensionAPI();
    const abc: PythonEnvironment[] = await apiNew.getEnvironments(resource || 'all');
    console.log('Python envs:', abc);
    return undefined;
}

export async function getEnvironmentVariables(resource?: Resource) {
    const api = await getLegacyPythonExtensionEnviromentAPI();
    return api.environments.getEnvironmentVariables(resource);
}

export async function resolveEnvironment(
    env: Environment | EnvironmentPath | string,
): Promise<PythonEnvironment | undefined> {
    // const api = await getLegacyPythonExtensionEnviromentAPI();
    // return api.environments.resolveEnvironment(env);

    const apiNew = await getPythonEnviromentExtensionAPI();

    // Handle different input types for the new API
    if (typeof env === 'string') {
        // Convert string path to Uri for the new API
        return apiNew.resolveEnvironment(Uri.file(env));
    } else if (typeof env === 'object' && 'path' in env) {
        // EnvironmentPath has a uri property
        return apiNew.resolveEnvironment(Uri.file(env.path));
    } else {
        return undefined;
    }
}

export async function legacyResolveEnvironment(
    env: Environment | EnvironmentPath | string,
): Promise<ResolvedEnvironment | undefined> {
    const api = await getLegacyPythonExtensionEnviromentAPI();
    return api.environments.resolveEnvironment(env);
}

export async function getLegacyActiveEnvironmentPath(resource?: Resource) {
    const api = await getLegacyPythonExtensionEnviromentAPI();
    return api.environments.getActiveEnvironmentPath(resource);
}

export async function getActiveEnvironmentPath(resource?: Resource): Promise<PythonEnvironment | undefined> {
    const api = await getPythonEnviromentExtensionAPI();

    // Convert Resource to Uri if it exists
    let resourceUri: Uri | undefined;
    if (resource instanceof Uri) {
        resourceUri = resource;
    } else if (resource && 'uri' in resource) {
        // WorkspaceFolder type
        resourceUri = resource.uri;
    }

    return api.getEnvironment(resourceUri);
}

/**
 * Gets Python interpreter details using the legacy Python extension API.
 *
 * This function retrieves the active Python environment for a given resource using the
 * legacy @vscode/python-extension API. It resolves the environment to get the executable
 * path and handles path quoting for paths containing spaces.
 *
 * @param resource Optional URI to specify the workspace/folder context for interpreter selection
 * @returns Promise resolving to interpreter details containing the executable path and resource
 */
export async function getLegacyInterpreterDetails(resource?: Uri): Promise<IInterpreterDetails> {
    const api = await getLegacyPythonExtensionEnviromentAPI();

    const environment = await api.environments.resolveEnvironment(api.environments.getActiveEnvironmentPath(resource));
    if (environment?.executable.uri) {
        return { path: [environment?.executable.uri.fsPath], resource };
    }
    return { path: undefined, resource };
}

export function quoteStringIfNecessary(arg: string): string {
    // Always return if already quoted to avoid double-quoting
    if (arg.startsWith('"') && arg.endsWith('"')) {
        return arg;
    }

    // Quote if contains common shell special characters that are problematic across multiple shells
    // Includes: space, &, |, <, >, ;, ', ", `, (, ), [, ], {, }, $
    const needsQuoting = /[\s&|<>;'"`()\[\]{}$]/.test(arg);

    return needsQuoting ? `"${arg}"` : arg;
}

export async function getInterpreterDetails(resource?: Uri): Promise<IInterpreterDetails> {
    const api = await getPythonEnviromentExtensionAPI();

    // A promise that resolves to the current Python environment, or undefined if none is set.
    const env: PythonEnvironment | undefined = await api.getEnvironment(resource);
    // resolve the environment to get full details
    const resolvedEnv = env ? await api.resolveEnvironment(env?.environmentPath) : undefined;
    const executablePath = resolvedEnv?.execInfo.activatedRun?.executable
        ? resolvedEnv.execInfo.activatedRun.executable
        : resolvedEnv?.execInfo.run.executable;

    // Quote the executable path if necessary
    const a: IInterpreterDetails = {
        path: executablePath ? [quoteStringIfNecessary(executablePath)] : undefined,
        resource,
    };
    return a;
}
