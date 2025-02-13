// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';
import * as fs from 'fs-extra';
import { parse } from 'jsonc-parser';
import { DebugConfiguration, Uri, WorkspaceFolder } from 'vscode';
import { getConfiguration, getWorkspaceFolder } from '../../../common/vscodeapi';
import { traceLog } from '../../../common/log/logging';

export async function getConfigurationsForWorkspace(workspace: WorkspaceFolder): Promise<DebugConfiguration[]> {
    traceLog('Getting configurations for workspace');
    const filename = path.join(workspace.uri.fsPath, '.vscode', 'launch.json');
    if (!(await fs.pathExists(filename))) {
        return getConfigurationsFromSettings(workspace);
    }
    const text = await fs.readFile(filename, 'utf-8');
    const parsed = parse(text, [], { allowTrailingComma: true, disallowComments: false });
    // no launch.json or no configurations found in launch.json, look in settings.json
    if (!parsed || !parsed.configurations) {
        traceLog('No configurations found in launch.json, looking in settings.json.');
        return getConfigurationsFromSettings(workspace);
    }
    // configurations found in launch.json, verify them then return
    if (!Array.isArray(parsed.configurations) || parsed.configurations.length === 0) {
        throw Error('Invalid configurations in launch.json');
    }
    if (!parsed.version) {
        throw Error('Missing field in launch.json: version');
    }
    traceLog('Using configuration in launch.json');
    return parsed.configurations;
}

export async function getConfigurationsByUri(uri?: Uri): Promise<DebugConfiguration[]> {
    if (uri) {
        const workspace = getWorkspaceFolder(uri);
        if (workspace) {
            return getConfigurationsForWorkspace(workspace);
        }
    }
    return [];
}

export function getConfigurationsFromSettings(workspace: WorkspaceFolder): DebugConfiguration[] {
    // look in settings.json
    const codeWorkspaceConfig = getConfiguration('launch', workspace);
    // if this includes user configs, how do I make sure it selects the workspace ones first
    if (
        !codeWorkspaceConfig.configurations ||
        !Array.isArray(codeWorkspaceConfig.configurations) ||
        codeWorkspaceConfig.configurations.length === 0
    ) {
        throw Error('No configurations found in launch.json or settings.json');
    }
    traceLog('Using configuration in workspace settings.json.');
    return codeWorkspaceConfig.configurations;
}
