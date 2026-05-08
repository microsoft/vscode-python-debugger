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
import { traceLog } from '../../common/log/logging';

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
        const debugConfig: AttachRequestArguments & DebugConfiguration = { ...data };

        // Remove the 'purpose' field from the child process debug configuration.
        // The child session inherits the parent's configuration (including 'purpose')
        // via debugpy's notify_of_subprocess. If the parent is a test debug session
        // (purpose: ['debug-test']), the child would also appear to be a test session.
        // This can cause the Python extension's test adapter to incorrectly treat the
        // child process session termination as the end of the test run, which results
        // in premature disconnection of the parent (test runner) debug session.
        // See: https://github.com/microsoft/vscode-python-debugger/issues/981
        delete debugConfig.purpose;

        const debugSessionOption: DebugSessionOptions = {
            parentSession: parentSession,
            lifecycleManagedByParent: true,
        };
        const folder = this.getRelatedWorkspaceFolder(debugConfig);
        traceLog('Start debugger in the attach child proccess');
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
