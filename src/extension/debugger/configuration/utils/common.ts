/* eslint-disable @typescript-eslint/no-explicit-any */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { Uri, WorkspaceFolder } from 'vscode';
import { getWorkspaceFolder } from '../../../common/vscodeapi';
import { sendTelemetryEvent } from '../../../telemetry';
import { EventName } from '../../../telemetry/constants';

/**
 * @returns whether the provided parameter is a JavaScript String or not.
 */
function isString(str: any): str is string {
    return typeof str === 'string' || str instanceof String;
}

/**
 * Resolves VS Code variable placeholders in a string value.
 *
 * Specifically handles:
 * - `${workspaceFolder}` - replaced with the workspace folder path
 * - `${env.VAR}` or `${env:VAR}` - replaced with empty string
 * - Unknown variables - left as-is in the original `${variable}` format
 *
 * @param value The string containing variable placeholders to resolve
 * @param rootFolder Fallback folder path to use if no workspace folder is available
 * @param folder The workspace folder context for variable resolution
 * @returns The string with variables resolved, or undefined if input was undefined
 */
export function resolveWorkspaceVariables(
    value: string | undefined,
    rootFolder: string | Uri | undefined,
    folder: WorkspaceFolder | undefined,
): string | undefined {
    if (!value) {
        return value;
    }

    // opt for folder with fallback to rootFolder
    const workspaceFolder = folder ? getWorkspaceFolder(folder.uri) : undefined;
    const workspaceFolderPath = workspaceFolder ? workspaceFolder.uri.fsPath : rootFolder;

    // Replace all ${variable} patterns
    return value.replace(/\$\{([^}]+)\}/g, (match: string, variableName: string) => {
        // Handle workspaceFolder variable
        if (variableName === 'workspaceFolder' && isString(workspaceFolderPath)) {
            // Track usage of this potentially deprecated code path
            sendTelemetryEvent(EventName.DEPRECATED_CODE_PATH_USAGE, undefined, {
                codePath: 'workspaceFolder_substitution',
            });
            return workspaceFolderPath;
        }

        // Replace environment variables with empty string
        if (variableName.startsWith('env.') || variableName.startsWith('env:')) {
            // Track usage of this potentially deprecated code path
            sendTelemetryEvent(EventName.DEPRECATED_CODE_PATH_USAGE, undefined, {
                codePath: 'env_variable_substitution',
            });
            return '';
        }

        // Unknown variables are left unchanged
        return match;
    });
}
