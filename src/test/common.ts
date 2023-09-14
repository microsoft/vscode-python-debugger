// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

// IMPORTANT: Do not import anything from the 'client' folder in this file as that folder is not available during smoke tests.

import * as fs from 'fs-extra';
import { ConfigurationTarget, TextDocument, Uri } from 'vscode';
import { IS_MULTI_ROOT_TEST } from './constants';
import { IExtensionApi } from '../extension/apiTypes';
import { assert } from 'chai';

export const PYTHON_PATH = getPythonPath();

export async function clearPythonPathInWorkspaceFolder(resource: string | Uri) {
    const vscode = require('vscode') as typeof import('vscode');
    return retryAsync(setPythonPathInWorkspace)(resource, vscode.ConfigurationTarget.WorkspaceFolder);
}

export async function setPythonPathInWorkspaceRoot(pythonPath: string) {
    const vscode = require('vscode') as typeof import('vscode');
    return retryAsync(setPythonPathInWorkspace)(undefined, vscode.ConfigurationTarget.Workspace, pythonPath);
}

export const resetGlobalPythonPathSetting = async () => retryAsync(restoreGlobalPythonPathSetting)();

export async function openFile(file: string): Promise<TextDocument> {
    const vscode = require('vscode') as typeof import('vscode');
    const textDocument = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(textDocument);
    assert(vscode.window.activeTextEditor, 'No active editor');
    return textDocument;
}

export function retryAsync(this: any, wrapped: Function, retryCount: number = 2) {
    return async (...args: any[]) => {
        return new Promise((resolve, reject) => {
            const reasons: any[] = [];

            const makeCall = () => {
                wrapped.call(this as Function, ...args).then(resolve, (reason: any) => {
                    reasons.push(reason);
                    if (reasons.length >= retryCount) {
                        reject(reasons);
                    } else {
                        // If failed once, lets wait for some time before trying again.
                        setTimeout(makeCall, 500);
                    }
                });
            };

            makeCall();
        });
    };
}

async function setPythonPathInWorkspace(
    resource: string | Uri | undefined,
    config: ConfigurationTarget,
    pythonPath?: string,
) {
    const vscode = require('vscode') as typeof import('vscode');
    if (config === vscode.ConfigurationTarget.WorkspaceFolder && !IS_MULTI_ROOT_TEST) {
        return;
    }
    const resourceUri = typeof resource === 'string' ? vscode.Uri.file(resource) : resource;
    const settings = vscode.workspace.getConfiguration('python', resourceUri || null);
    const value = settings.inspect<string>('defaultInterpreterPath');
    const prop: 'workspaceFolderValue' | 'workspaceValue' =
        config === vscode.ConfigurationTarget.Workspace ? 'workspaceValue' : 'workspaceFolderValue';
    if (value && value[prop] !== pythonPath) {
        await settings.update('defaultInterpreterPath', pythonPath, config);
        // await disposePythonSettings();
    }
}
async function restoreGlobalPythonPathSetting(): Promise<void> {
    const vscode = require('vscode') as typeof import('vscode');
    const pythonConfig = vscode.workspace.getConfiguration('python', null as any as Uri);
    await Promise.all([
        pythonConfig.update('defaultInterpreterPath', undefined, true),
        pythonConfig.update('defaultInterpreterPath', undefined, true),
    ]);
    // await disposePythonSettings();
}

function getPythonPath(): string {
    if (process.env.CI_PYTHON_PATH && fs.existsSync(process.env.CI_PYTHON_PATH)) {
        return process.env.CI_PYTHON_PATH;
    }

    // TODO: Change this to python3.
    // See https://github.com/microsoft/vscode-python/issues/10910.
    return 'python';
}

export interface IExtensionTestApi extends IExtensionApi {}

export const debuggerTypeName = 'debugpy';
