// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ConfigurationChangeEvent, ConfigurationTarget, Uri, WorkspaceConfiguration, WorkspaceFolder } from 'vscode';
import { getInterpreterDetails } from './python';
import { getConfiguration, getWorkspaceFolder, getWorkspaceFolders } from './vscodeapi';
import { isUnitTestExecution } from './constants';
import { VersionInfo } from '@vscode/python-extension';

export interface ISettings {
    workspace: string;
    interpreter: string[];
    envFile?: string;
}

export async function getExtensionSettings(namespace: string, includeInterpreter?: boolean): Promise<ISettings[]> {
    const settings: ISettings[] = [];
    const workspaces = getWorkspaceFolders();
    for (const workspace of workspaces) {
        const workspaceSetting = await getWorkspaceSettings(namespace, workspace, includeInterpreter);
        settings.push(workspaceSetting);
    }

    return settings;
}

function resolveWorkspace(workspace: WorkspaceFolder, value: string): string {
    return value.replace('${workspaceFolder}', workspace.uri.fsPath);
}

export function getEnvFile(namespace: string, resource: Uri): string {
    const config = getConfiguration(namespace, resource);
    const envFile = config.get<string>('envFile', '');
    return envFile;
}

export function getInterpreterFromSetting(namespace: string) {
    const config = getConfiguration(namespace);
    return config.get<string[]>('interpreter');
}

export async function getWorkspaceSettings(
    namespace: string,
    workspace: WorkspaceFolder,
    includeInterpreter?: boolean,
): Promise<ISettings> {
    const config = getConfiguration(namespace, workspace.uri);

    let interpreter: string[] | undefined = [];
    if (includeInterpreter) {
        interpreter = getInterpreterFromSetting(namespace);
        if (interpreter === undefined || interpreter.length === 0) {
            interpreter = (await getInterpreterDetails(workspace.uri)).path;
        }
    }

    const workspaceSetting = {
        workspace: workspace.uri.toString(),
        interpreter: (interpreter ?? []).map((s) => resolveWorkspace(workspace, s)),
        envFile: config.get<string>('envFile', ''),
    };
    return workspaceSetting;
}

export function checkIfConfigurationChanged(e: ConfigurationChangeEvent, namespace: string): boolean {
    const settings = [`${namespace}.interpreter`, `${namespace}.envFile`];
    const changed = settings.map((s) => e.affectsConfiguration(s));
    return changed.includes(true);
}

function getSettingsUriAndTarget(resource: Uri | undefined): { uri: Uri | undefined; target: ConfigurationTarget } {
    const workspaceFolder = resource ? getWorkspaceFolder(resource) : undefined;
    let workspaceFolderUri: Uri | undefined = workspaceFolder ? workspaceFolder.uri : undefined;
    const workspaceFolders = getWorkspaceFolders();
    if (!workspaceFolderUri && Array.isArray(workspaceFolders) && workspaceFolders.length > 0) {
        workspaceFolderUri = workspaceFolders[0].uri;
    }

    const target = workspaceFolderUri ? ConfigurationTarget.WorkspaceFolder : ConfigurationTarget.Global;
    return { uri: workspaceFolderUri, target };
}

export async function updateSetting(
    section: string = 'debugpy',
    setting: string,
    value?: unknown,
    resource?: Uri,
    configTarget?: ConfigurationTarget,
) {
    const defaultSetting = {
        uri: resource,
        target: configTarget || ConfigurationTarget.WorkspaceFolder,
    };
    let settingsInfo = defaultSetting;
    if (section === 'debugpy' && configTarget !== ConfigurationTarget.Global) {
        settingsInfo = getSettingsUriAndTarget(resource);
    }

    configTarget = configTarget || settingsInfo.target;

    const configSection = getConfiguration(section, settingsInfo.uri);
    const currentValue = configSection.inspect(setting);
    if (
        currentValue !== undefined &&
        ((configTarget === ConfigurationTarget.Global && currentValue.globalValue === value) ||
            (configTarget === ConfigurationTarget.Workspace && currentValue.workspaceValue === value) ||
            (configTarget === ConfigurationTarget.WorkspaceFolder && currentValue.workspaceFolderValue === value))
    ) {
        return;
    }
    await configSection.update(setting, value, configTarget);
    await verifySetting(configSection, configTarget, setting, value);
}

export function isTestExecution(): boolean {
    return process.env.VSC_PYTHON_CI_TEST === '1';
}

export async function verifySetting(
    configSection: WorkspaceConfiguration,
    target: ConfigurationTarget,
    settingName: string,
    value?: unknown,
): Promise<void> {
    if (isTestExecution() && !isUnitTestExecution()) {
        let retries = 0;
        do {
            const setting = configSection.inspect(settingName);
            if (!setting && value === undefined) {
                break; // Both are unset
            }
            if (setting && value !== undefined) {
                // Both specified
                let actual;
                if (target === ConfigurationTarget.Global) {
                    actual = setting.globalValue;
                } else if (target === ConfigurationTarget.Workspace) {
                    actual = setting.workspaceValue;
                } else {
                    actual = setting.workspaceFolderValue;
                }
                if (actual === value) {
                    break;
                }
            }
            // Wait for settings to get refreshed.
            await new Promise((resolve) => setTimeout(resolve, 250));
            retries += 1;
        } while (retries < 20);
    }
}

export function getRawVersion(version: VersionInfo | undefined) {
    if (version) {
        return `${version.major}.${version.minor}.${version.micro}`;
    }
    return ``;
}
