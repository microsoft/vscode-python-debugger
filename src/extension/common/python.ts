// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/naming-convention */
import { Environment, EnvironmentPath, PythonExtension, Resource } from '@vscode/python-extension';
import { commands, extensions, Uri } from 'vscode';
import { createDeferred } from './utils/async';

interface IExtensionApi {
    ready: Promise<void>;
    settings: {
        getExecutionDetails(resource?: Resource): { execCommand: string[] | undefined };
    };

}export interface IInterpreterDetails {
    path?: string[];
    resource?: Uri;
}
async function activateExtension() {
    const extension = extensions.getExtension('ms-python.python');
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
    return await PythonExtension.api();
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
    if (environment?.executable.uri) {
        return { path: [environment?.executable.uri.fsPath], resource };
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
