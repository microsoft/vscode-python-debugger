// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { debug, DebugConfiguration, DebugSession, DebugSessionOptions, l10n, WorkspaceFolder } from 'vscode';
import { captureTelemetry } from '../../telemetry';
import { EventName } from '../../telemetry/constants';
import { AttachRequestArguments } from '../../types';
import { IChildProcessAttachService } from './types';
import { getWorkspaceFolders, showErrorMessage } from '../../common/vscodeapi';
import { noop } from '../../common/utils/misc';

/**
 * This class is responsible for attaching the debugger to any
 * child processes launched. I.e. this is the class responsible for multi-proc debugging.
 * @export
 * @class ChildProcessAttachEventHandler
 * @implements {IChildProcessAttachService}
 */
export class ChildProcessAttachService implements IChildProcessAttachService {
    @captureTelemetry(EventName.DEBUGGER_ATTACH_TO_CHILD_PROCESS)
    public async attach(data: AttachRequestArguments & DebugConfiguration, parentSession: DebugSession): Promise<void> {
        const debugConfig: AttachRequestArguments & DebugConfiguration = data;
        const debugSessionOption: DebugSessionOptions = {
            parentSession: parentSession,
            lifecycleManagedByParent: true,
        };
        const folder = this.getRelatedWorkspaceFolder(debugConfig);
        const launched = await debug.startDebugging(folder, debugConfig, debugSessionOption);
        if (!launched) {
            showErrorMessage(l10n.t('Failed to launch debugger for child process {0}', debugConfig.subProcessId!)).then(
                noop,
                noop,
            );
        }
    }

    private getRelatedWorkspaceFolder(
        config: AttachRequestArguments & DebugConfiguration,
    ): WorkspaceFolder | undefined {
        const workspaceFolder = config.workspaceFolder;

        const hasWorkspaceFolders = (getWorkspaceFolders()?.length || 0) > 0;
        if (!hasWorkspaceFolders || !workspaceFolder) {
            return;
        }
        return getWorkspaceFolders()!.find((ws) => ws.uri.fsPath === workspaceFolder);
    }
}
