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
        // Check launch config in the workspace file
        const codeWorkspaceConfig = getConfiguration('launch', workspace);
        if (!codeWorkspaceConfig.configurations || !Array.isArray(codeWorkspaceConfig.configurations)) {
            return [];
        }
        traceLog('Using configuration in workspace');
        return codeWorkspaceConfig.configurations;
    }

    const text = await fs.readFile(filename, 'utf-8');
    const parsed = parse(text, [], { allowTrailingComma: true, disallowComments: false });
    if (!parsed.configurations || !Array.isArray(parsed.configurations)) {
        throw Error('Missing field in launch.json: configurations');
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
