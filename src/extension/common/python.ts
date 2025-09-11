// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/naming-convention */
import {
    ActiveEnvironmentPathChangeEvent,
    Environment,
    EnvironmentPath,
    PythonExtension,
    Resource,
} from '@vscode/python-extension';
import { commands, EventEmitter, extensions, Uri, Event, Disposable } from 'vscode';
import { createDeferred } from './utils/async';
import { traceError, traceLog } from './log/logging';

interface IExtensionApi {
    ready: Promise<void>;
    settings: {
        getExecutionDetails(resource?: Resource): { execCommand: string[] | undefined };
    };
}

export interface IInterpreterDetails {
    path?: string[];
    resource?: Uri;
}

const onDidChangePythonInterpreterEvent = new EventEmitter<IInterpreterDetails>();
export const onDidChangePythonInterpreter: Event<IInterpreterDetails> = onDidChangePythonInterpreterEvent.event;
async function activateExtension() {
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
async function activateEnvsExtension() {
    const extension = extensions.getExtension('ms-python.vscode-python-envs');
    if (extension) {
        if (!extension.isActive) {
            await extension.activate();
        }
    }
    return extension;
}

async function getPythonExtensionAPI(): Promise<IExtensionApi | undefined> {
    const extension = await activateExtension();
    return extension?.exports as IExtensionApi;
}

async function getPythonExtensionEnviromentAPI(): Promise<PythonExtension> {
    // Load the Python extension API
    await activateExtension();
    return await PythonExtension.api();
}

export async function initializePython(disposables: Disposable[]): Promise<void> {
    try {
        const api = await getPythonExtensionEnviromentAPI();

        if (api) {
            disposables.push(
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

export async function runPythonExtensionCommand(command: string, ...rest: any[]) {
    await activateExtension();
    return await commands.executeCommand(command, ...rest);
}

export async function getSettingsPythonPath(resource?: Uri): Promise<string[] | undefined> {
    const api = await getPythonExtensionAPI();
    return api?.settings.getExecutionDetails(resource).execCommand;
}

export async function getEnvironmentVariables(resource?: Resource) {
    const api = await getPythonExtensionEnviromentAPI();
    return api.environments.getEnvironmentVariables(resource);
}

export async function resolveEnvironment(env: Environment | EnvironmentPath | string) {
    const api = await getPythonExtensionEnviromentAPI();
    return api.environments.resolveEnvironment(env);
}

export async function getActiveEnvironmentPath(resource?: Resource) {
    const api = await getPythonExtensionEnviromentAPI();
    return api.environments.getActiveEnvironmentPath(resource);
}

export async function getInterpreterDetails(resource?: Uri): Promise<IInterpreterDetails> {
    const api = await getPythonExtensionEnviromentAPI();
    const environment = await api.environments.resolveEnvironment(api.environments.getActiveEnvironmentPath(resource));
    const rawExecPath = environment?.executable.uri?.fsPath;
    if (rawExecPath) {
        let execPath = rawExecPath;
        if (rawExecPath.includes(' ') && !(rawExecPath.startsWith('"') && rawExecPath.endsWith('"'))) {
            execPath = `"${rawExecPath}"`;
        }
        return { path: [execPath], resource };
    }
    return { path: undefined, resource };
}

export async function hasInterpreters() {
    const api = await getPythonExtensionEnviromentAPI();
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
    await Promise.race([onAddedToCollection.promise, api?.environments.refreshEnvironments()]);

    return api.environments.known.length > 0;
}

export async function getInterpreters() {
    const api = await getPythonExtensionEnviromentAPI();
    return api.environments.known || [];
}
