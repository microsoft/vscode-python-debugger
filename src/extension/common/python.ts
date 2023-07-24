// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/naming-convention */
import { commands, Disposable, Event, EventEmitter, extensions, Uri } from 'vscode';
import { traceError, traceLog } from './log/logging';
import { EnvironmentVariables } from './variables/types';
import {
    ActiveEnvironmentPathChangeEvent,
    Environment,
    EnvironmentPath,
    EnvironmentsChangeEvent,
    RefreshOptions,
    ResolvedEnvironment,
    Resource,
} from './pythonTypes';
import { createDeferred } from './utils/async';

interface IExtensionApi {
    ready: Promise<void>;
    debug: {
        getRemoteLauncherCommand(host: string, port: number, waitUntilDebuggerAttaches: boolean): Promise<string[]>;
        getDebuggerPackagePath(): Promise<string | undefined>;
    };
    environments: {
        known: Environment[];
        getActiveEnvironmentPath(resource?: Resource): EnvironmentPath;
        resolveEnvironment(
            environment: Environment | EnvironmentPath | string | undefined,
        ): Promise<ResolvedEnvironment | undefined>;
        readonly onDidChangeActiveEnvironmentPath: Event<ActiveEnvironmentPathChangeEvent>;
        getEnvironmentVariables(resource?: Resource): EnvironmentVariables;
        refreshEnvironments(options?: RefreshOptions): Promise<void>;
        readonly onDidChangeEnvironments: Event<EnvironmentsChangeEvent>;
    };
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

export async function initializePython(disposables: Disposable[]): Promise<void> {
    try {
        const api = await getPythonExtensionAPI();

        if (api) {
            disposables.push(
                api.environments.onDidChangeActiveEnvironmentPath((e) => {
                    onDidChangePythonInterpreterEvent.fire({ path: [e.path], resource: e.resource?.uri });
                }),
            );

            traceLog('Waiting for interpreter from python extension.');
            onDidChangePythonInterpreterEvent.fire(await getInterpreterDetails());
        }
    } catch (error) {
        traceError('Error initializing python: ', error);
    }
}

export async function getDebuggerPath(): Promise<string | undefined> {
    const api = await getPythonExtensionAPI();
    return api?.debug.getDebuggerPackagePath();
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
    const api = await getPythonExtensionAPI();
    return api?.environments.getEnvironmentVariables(resource);
}

export async function resolveEnvironment(env: Environment | EnvironmentPath | string | undefined) {
    const api = await getPythonExtensionAPI();
    return api?.environments.resolveEnvironment(env);
}

export async function getActiveEnvironmentPath(resource?: Resource) {
    const api = await getPythonExtensionAPI();
    return api?.environments.getActiveEnvironmentPath(resource);
}

export async function getInterpreterDetails(resource?: Uri): Promise<IInterpreterDetails> {
    const api = await getPythonExtensionAPI();
    const environment = await api?.environments.resolveEnvironment(
        api?.environments.getActiveEnvironmentPath(resource),
    );
    if (environment?.executable.uri) {
        return { path: [environment?.executable.uri.fsPath], resource };
    }
    return { path: undefined, resource };
}

export async function hasInterpreters() {
    const api = await getPythonExtensionAPI();
    if (api) {
        const onAddedToCollection = createDeferred();
        api?.environments.onDidChangeEnvironments(async () => {
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
}

export async function getInterpreters() {
    const api = await getPythonExtensionAPI();
    return api?.environments.known || [];
}
