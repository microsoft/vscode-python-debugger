import {
    workspace,
    debug,
    WorkspaceFolder,
    DebugConfiguration,
    DebugSession,
    DebugSessionOptions,
    FileSystemWatcher,
} from 'vscode';

export function createFileSystemWatcher(args: any): FileSystemWatcher {
    return workspace.createFileSystemWatcher(args);
}

export function debugStartDebugging(
    folder: WorkspaceFolder | undefined,
    nameOrConfiguration: string | DebugConfiguration,
    parentSessionOrOptions?: DebugSession | DebugSessionOptions,
): Thenable<boolean> {
    return debug.startDebugging(folder, nameOrConfiguration, parentSessionOrOptions);
}
