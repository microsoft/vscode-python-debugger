import { workspace } from 'vscode';

export function createFileSystemWatcher(args: any) {
    return workspace.createFileSystemWatcher(args);
}
