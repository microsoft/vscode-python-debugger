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
import { EventEmitter, extensions, Uri, Disposable, Extension } from 'vscode';
import { createDeferred } from './utils/async';
import { traceError, traceLog } from './log/logging';

/**
 * Interface for the Python extension API.
 */
interface LegacyIExtensionApi {
    ready: Promise<void>;
    settings: {
        getExecutionDetails(resource?: Resource): { execCommand: string[] | undefined };
    };
}

/**
 * Details about a Python interpreter.
 */
export interface LegacyIInterpreterDetails {
    /** Array of path components to the Python executable */
    path?: string[];
    /** The workspace resource associated with this interpreter */
    resource?: Uri;
}

// /** Event emitter for Python interpreter changes */
// const legacyOnDidChangePythonInterpreterEvent = new EventEmitter<LegacyIInterpreterDetails>();

// /** Event that fires when the active Python interpreter changes */
// export const legacyOnDidChangePythonInterpreter: Event<LegacyIInterpreterDetails> =
//     legacyOnDidChangePythonInterpreterEvent.event;
/**
 * Activates the Python extension and ensures it's ready for use.
 * @returns The activated Python extension instance
 */
async function legacyActivateExtension(): Promise<Extension<any> | undefined> {
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

/**
 * Gets the Python extension's API interface.
 * @returns The Python extension API or undefined if not available
 */
async function legacyGetPythonExtensionAPI(): Promise<LegacyIExtensionApi | undefined> {
    const extension = await legacyActivateExtension();
    return extension?.exports as LegacyIExtensionApi;
}

/**
 * Gets the Python extension's environment API.
 * @returns The Python extension environment API
 */
async function legacyGetPythonExtensionEnviromentAPI(): Promise<PythonExtension> {
    // Load the Python extension API
    await legacyActivateExtension();
    return await PythonExtension.api();
}

/**
 * Initializes Python integration by setting up event listeners and getting initial interpreter details.
 * @param disposables Array to store disposable resources for cleanup
 */
export async function legacyInitializePython(
    disposables: Disposable[],
    onDidChangePythonInterpreterEvent: EventEmitter<LegacyIInterpreterDetails>,
): Promise<void> {
    try {
        const api = await legacyGetPythonExtensionEnviromentAPI();

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
            onDidChangePythonInterpreterEvent.fire(await legacyGetInterpreterDetails());
        }
    } catch (error) {
        traceError('Error initializing python: ', error);
    }
}

/**
 * Returns all the details needed to execute code within the selected environment,
 * corresponding to the specified resource taking into account any workspace-specific settings
 * for the workspace to which this resource belongs.
 * @param resource Optional workspace resource to get settings for
 * @returns Array of command components or undefined if not available
 */
export async function legacyGetSettingsPythonPath(resource?: Uri): Promise<string[] | undefined> {
    const api = await legacyGetPythonExtensionAPI();
    return api?.settings.getExecutionDetails(resource).execCommand;
}

/**
 * Returns the environment variables used by the extension for a resource, which includes the custom
 * variables configured by user in `.env` files.
 * @param resource Optional workspace resource to get environment variables for
 * @returns Environment variables object
 */
export async function legacyGetEnvironmentVariables(resource?: Resource): Promise<EnvironmentVariables> {
    const api = await legacyGetPythonExtensionEnviromentAPI();
    return Promise.resolve(api.environments.getEnvironmentVariables(resource));
}

/**
 * Returns details for the given environment, or `undefined` if the env is invalid.
 * @param env Environment to resolve (can be Environment object, path, or string)
 * @returns Resolved environment details
 */
export async function legacyResolveEnvironment(
    env: Environment | EnvironmentPath | string,
): Promise<ResolvedEnvironment | undefined> {
    const api = await legacyGetPythonExtensionEnviromentAPI();
    return api.environments.resolveEnvironment(env);
}

/**
 * Returns the environment configured by user in settings. Note that this can be an invalid environment, use
 * resolve the environment to get full details.
 * @param resource Optional workspace resource to get active environment for
 * @returns Path to the active environment
 */
export async function legacyGetActiveEnvironmentPath(resource?: Resource): Promise<EnvironmentPath> {
    const api = await legacyGetPythonExtensionEnviromentAPI();
    return api.environments.getActiveEnvironmentPath(resource);
}

/**
 * Gets detailed information about the active Python interpreter.
 * @param resource Optional workspace resource to get interpreter details for
 * @returns Interpreter details including path and resource information
 */
export async function legacyGetInterpreterDetails(resource?: Uri): Promise<LegacyIInterpreterDetails> {
    const api = await legacyGetPythonExtensionEnviromentAPI();
    const environment = await api.environments.resolveEnvironment(api.environments.getActiveEnvironmentPath(resource));
    if (environment?.executable.uri) {
        return { path: [environment?.executable.uri.fsPath], resource };
    }
    return { path: undefined, resource };
}

/**
 * Checks if any Python interpreters are available in the system.
 * @returns True if interpreters are found, false otherwise
 */
export async function legacyHasInterpreters(): Promise<boolean> {
    const api = await legacyGetPythonExtensionEnviromentAPI();
    const onAddedToCollection = createDeferred();
    api.environments.onDidChangeEnvironments(async () => {
        if (api.environments.known) {
            onAddedToCollection.resolve();
        }
    });
    const initialEnvs = api.environments.known;
    if (initialEnvs.length > 0) {
        return true;
    }
    // Initiates a refresh of Python environments within the specified scope.
    await Promise.race([onAddedToCollection.promise, api?.environments.refreshEnvironments()]);

    return api.environments.known.length > 0;
}

/**
 *  Gets environments known to the extension at the time of fetching the property. Note this may not
 * contain all environments in the system as a refresh might be going on.
 * @returns Array of known Python environments
 */
export async function legacyGetInterpreters(): Promise<readonly Environment[]> {
    const api = await legacyGetPythonExtensionEnviromentAPI();
    return api.environments.known || [];
}
