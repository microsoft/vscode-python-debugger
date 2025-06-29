/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as path from 'path';
import {
    DebugAdapterDescriptor,
    DebugAdapterExecutable,
    DebugAdapterServer,
    DebugSession,
    l10n,
    WorkspaceFolder,
} from 'vscode';
import { AttachRequestArguments, LaunchRequestArguments } from '../../types';
import { IDebugAdapterDescriptorFactory } from '../types';
import { executeCommand, showErrorMessage } from '../../common/vscodeapi';
import { traceLog, traceVerbose } from '../../common/log/logging';
import { EventName } from '../../telemetry/constants';
import { sendTelemetryEvent } from '../../telemetry';
import { getInterpreterDetails, resolveEnvironment, runPythonExtensionCommand } from '../../common/python';
import { Commands, EXTENSION_ROOT_DIR } from '../../common/constants';
import { Common, DebugConfigStrings, Interpreters } from '../../common/utils/localize';
import { IPersistentStateFactory } from '../../common/types';
import { ResolvedEnvironment } from '@vscode/python-extension';
import { fileToCommandArgumentForPythonExt } from '../../common/stringUtils';

// persistent state names, exported to make use of in testing
export enum debugStateKeys {
    doNotShowAgain = 'doNotShowPython36DebugDeprecatedAgain',
}

export class DebugAdapterDescriptorFactory implements IDebugAdapterDescriptorFactory {
    constructor(private persistentState: IPersistentStateFactory) {}

    public async createDebugAdapterDescriptor(
        session: DebugSession,
        _executable: DebugAdapterExecutable | undefined,
    ): Promise<DebugAdapterDescriptor | undefined> {
        const configuration = session.configuration as LaunchRequestArguments | AttachRequestArguments;

        // There are four distinct scenarios here:
        //
        // 1. "launch";
        // 2. "attach" with "processId";
        // 3. "attach" with "listen";
        // 4. "attach" with "connect" (or legacy "host"/"port");
        //
        // For the first three, we want to spawn the debug adapter directly.
        // For the last one, the adapter is already listening on the specified socket.

        if (configuration.request === 'attach') {
            if (configuration.connect !== undefined) {
                traceLog(
                    `Connecting to DAP Server at:  ${configuration.connect.host ?? '127.0.0.1'}:${
                        configuration.connect.port
                    }`,
                );
                return new DebugAdapterServer(
                    Number(configuration.connect.port),
                    configuration.connect.host ?? '127.0.0.1',
                );
            } else if (configuration.port !== undefined) {
                traceLog(`Connecting to DAP Server at:  ${configuration.host ?? '127.0.0.1'}:${configuration.port}`);
                return new DebugAdapterServer(Number(configuration.port), configuration.host ?? '127.0.0.1');
            } else if (configuration.listen === undefined && configuration.processId === undefined) {
                throw new Error('"request":"attach" requires either "connect", "listen", or "processId"');
            }
        }

        const command = await this.getDebugAdapterPython(configuration, session.workspaceFolder);
        if (command.length !== 0) {
            if (configuration.request === 'attach' && configuration.processId !== undefined) {
                sendTelemetryEvent(EventName.DEBUGGER_ATTACH_TO_LOCAL_PROCESS);
            }

            let executable = command.shift() ?? 'python';

            // "logToFile" is not handled directly by the adapter - instead, we need to pass
            // the corresponding CLI switch when spawning it.
            const logArgs = configuration.logToFile ? ['--log-dir', EXTENSION_ROOT_DIR] : [];

            if (configuration.debugAdapterPath !== undefined) {
                const args = command.concat([configuration.debugAdapterPath, ...logArgs]);
                traceLog(`DAP Server launched with command: ${executable} ${args.join(' ')}`);
                executable = fileToCommandArgumentForPythonExt(executable);
                return new DebugAdapterExecutable(executable, args);
            }

            const debuggerAdapterPathToUse = path.join(EXTENSION_ROOT_DIR, 'bundled', 'libs', 'debugpy', 'adapter');

            const args = command.concat([debuggerAdapterPathToUse, ...logArgs]);
            traceLog(`DAP Server launched with command: ${executable} ${args.join(' ')}`);
            sendTelemetryEvent(EventName.DEBUG_ADAPTER_USING_WHEELS_PATH, undefined, { usingWheels: true });
            return new DebugAdapterExecutable(executable, args);
        } else {
            throw new Error(DebugConfigStrings.debugStopped);
        }
    }

    /**
     * Get the python executable used to launch the Python Debug Adapter.
     * In the case of `attach` scenarios, just use the workspace interpreter.
     * It is unlike user won't have a Python interpreter
     *
     * @private
     * @param {(LaunchRequestArguments | AttachRequestArguments)} configuration
     * @param {WorkspaceFolder} [workspaceFolder]
     * @returns {Promise<string>} Path to the python interpreter for this workspace.
     * @memberof DebugAdapterDescriptorFactory
     */
    private async getDebugAdapterPython(
        configuration: LaunchRequestArguments | AttachRequestArguments,
        workspaceFolder?: WorkspaceFolder,
    ): Promise<string[]> {
        if (configuration.debugAdapterPython !== undefined) {
            return this.getExecutableCommand(await resolveEnvironment(configuration.debugAdapterPython));
        } else if (configuration.pythonPath) {
            return this.getExecutableCommand(await resolveEnvironment(configuration.pythonPath));
        }

        const resourceUri = workspaceFolder ? workspaceFolder.uri : undefined;

        const interpreter = await getInterpreterDetails(resourceUri);

        if (interpreter?.path) {
            traceVerbose(`Selecting active interpreter as Python Executable for DA '${interpreter.path[0]}'`);
            return this.getExecutableCommand(await resolveEnvironment(interpreter.path[0]));
        }

        const prompts = [Interpreters.changePythonInterpreter];
        const selection = await showErrorMessage(
            l10n.t(
                'You need to select a Python interpreter before you start debugging.\n\nTip: click on "Select Interpreter" in the status bar.',
            ),
            { modal: true },
            ...prompts,
        );
        if (selection === Interpreters.changePythonInterpreter) {
            await executeCommand(Commands.Set_Interpreter);
            const interpreter = await getInterpreterDetails(resourceUri);
            if (interpreter?.path) {
                traceVerbose(`Selecting active interpreter as Python Executable for DA '${interpreter.path[0]}'`);
                return this.getExecutableCommand(await resolveEnvironment(interpreter.path[0]));
            }
        }
        return [];
    }

    private async showDeprecatedPythonMessage() {
        sendTelemetryEvent(EventName.DEBUGGER_PYTHON_37_DEPRECATED);
        const notificationPromptEnabled = this.persistentState.createGlobalPersistentState(
            debugStateKeys.doNotShowAgain,
            false,
        );
        if (notificationPromptEnabled.value) {
            return;
        }
        const prompts = [Interpreters.changePythonInterpreter, Common.doNotShowAgain];
        const selection = await showErrorMessage(
            l10n.t('The minimum supported Python version for the debugger extension is 3.9.'),
            { modal: true },
            ...prompts,
        );
        if (!selection) {
            return;
        }
        if (selection === Interpreters.changePythonInterpreter) {
            await runPythonExtensionCommand(Commands.Set_Interpreter);
        }
        if (selection === Common.doNotShowAgain) {
            // Never show the message again
            await this.persistentState
                .createGlobalPersistentState(debugStateKeys.doNotShowAgain, false)
                .updateValue(true);
        }
    }

    private async getExecutableCommand(interpreter: ResolvedEnvironment | undefined): Promise<string[]> {
        if (interpreter) {
            if (
                (interpreter.version?.major ?? 0) < 3 ||
                ((interpreter.version?.major ?? 0) <= 3 && (interpreter.version?.minor ?? 0) < 9)
            ) {
                this.showDeprecatedPythonMessage();
            }
            return interpreter.path.length > 0 ? [interpreter.path] : [];
        }
        return [];
    }
}
