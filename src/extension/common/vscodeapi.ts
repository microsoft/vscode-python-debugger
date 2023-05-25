// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    commands,
    ConfigurationScope,
    debug,
    DebugConfiguration,
    DebugSession,
    Disposable,
    DocumentFormattingEditProvider,
    DocumentSelector,
    env,
    languages,
    LogOutputChannel,
    MessageItem,
    MessageOptions,
    QuickPick,
    QuickPickItem,
    TextEditor,
    Uri,
    window,
    workspace,
    WorkspaceConfiguration,
    WorkspaceEdit,
    WorkspaceFolder,
} from 'vscode';

export function createOutputChannel(name: string): LogOutputChannel {
    return window.createOutputChannel(name, { log: true });
}

export function getConfiguration(section?: string, scope?: ConfigurationScope): WorkspaceConfiguration {
    return workspace.getConfiguration(section, scope);
}

export function registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable {
    return commands.registerCommand(command, callback, thisArg);
}

export function executeCommand<T = unknown>(command: string, ...rest: any[]): Thenable<T | undefined> {
    return commands.executeCommand(command, ...rest);
}

export const { onDidChangeConfiguration } = workspace;

export function isVirtualWorkspace(): boolean {
    const isVirtual = workspace.workspaceFolders && workspace.workspaceFolders.every((f) => f.uri.scheme !== 'file');
    return !!isVirtual;
}

export function getWorkspaceFolders(): readonly WorkspaceFolder[] {
    return workspace.workspaceFolders ?? [];
}

export function getWorkspaceFolder(uri: Uri): WorkspaceFolder | undefined {
    return workspace.getWorkspaceFolder(uri);
}

export function registerDocumentFormattingEditProvider(
    selector: DocumentSelector,
    provider: DocumentFormattingEditProvider,
): Disposable {
    return languages.registerDocumentFormattingEditProvider(selector, provider);
}

export function getActiveTextEditor(): TextEditor | undefined {
    const { activeTextEditor } = window;
    return activeTextEditor;
}

export function applyEdit(edit: WorkspaceEdit): Thenable<boolean> {
    return workspace.applyEdit(edit);
}

export function showErrorMessage<T extends string>(message: string, ...items: T[]): Thenable<T | undefined>;
export function showErrorMessage<T extends string>(
    message: string,
    options: MessageOptions,
    ...items: T[]
): Thenable<T | undefined>;
export function showErrorMessage<T extends MessageItem>(message: string, ...items: T[]): Thenable<T | undefined>;
export function showErrorMessage<T extends MessageItem>(
    message: string,
    options: MessageOptions,
    ...items: T[]
): Thenable<T | undefined>;

export function showErrorMessage<T>(message: string, ...items: any[]): Thenable<T | undefined> {
    return window.showErrorMessage(message, ...items);
}

export function showInformationMessage<T extends string>(message: string, ...items: T[]): Thenable<T | undefined>;
export function showInformationMessage<T extends string>(
    message: string,
    options: MessageOptions,
    ...items: T[]
): Thenable<T | undefined>;
export function showInformationMessage<T extends MessageItem>(message: string, ...items: T[]): Thenable<T | undefined>;
export function showInformationMessage<T extends MessageItem>(
    message: string,
    options: MessageOptions,
    ...items: T[]
): Thenable<T | undefined>;

export function showInformationMessage<T>(message: string, ...items: any[]): Thenable<T | undefined> {
    return window.showInformationMessage(message, ...items);
}

export function showWarningMessage(message: any, options?: any, ...items: any[]) {
    return window.showWarningMessage(message, options, ...items);
}

export function createQuickPick<T extends QuickPickItem>(): QuickPick<T> {
    return window.createQuickPick<T>();
}

export function launch(url: string): void {
    env.openExternal(Uri.parse(url));
}

export function startDebugging(
    folder: WorkspaceFolder | undefined,
    nameOrConfiguration: string | DebugConfiguration,
    parentSession?: DebugSession,
) {
    debug.startDebugging(folder, nameOrConfiguration, parentSession);
}
