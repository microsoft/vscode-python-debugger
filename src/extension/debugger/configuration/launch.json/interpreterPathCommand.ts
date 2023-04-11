// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

// import { injectable } from 'inversify';
import { Uri } from 'vscode';
import { getInterpreterDetails } from '../../../common/python';

export class InterpreterPathCommand {
    public readonly supportedWorkspaceTypes = { untrustedWorkspace: false, virtualWorkspace: false };

    public async _getSelectedInterpreterPath(args: { workspaceFolder: string } | string[]): Promise<string> {
        // If `launch.json` is launching this command, `args.workspaceFolder` carries the workspaceFolder
        // If `tasks.json` is launching this command, `args[1]` carries the workspaceFolder
        let workspaceFolder;
        if ('workspaceFolder' in args) {
            workspaceFolder = args.workspaceFolder;
        } else if (args[1]) {
            const [, second] = args;
            workspaceFolder = second;
        } else {
            workspaceFolder = undefined;
        }

        let workspaceFolderUri;
        try {
            workspaceFolderUri = workspaceFolder ? Uri.parse(workspaceFolder) : undefined;
        } catch (ex) {
            workspaceFolderUri = undefined;
        }

        const interpreter = await getInterpreterDetails(workspaceFolderUri);

        return interpreter.path ? interpreter.path[0] : 'python';
    }
}
