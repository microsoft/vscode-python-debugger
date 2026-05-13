'use strict';

import { registerDebugger } from './extensionInit';
import { IExtensionContext } from './common/types';
import { createOutputChannel, registerCommand } from './common/vscodeapi';
import { Commands } from './common/constants';
import { registerLogger, traceError } from './common/log/logging';
import { sendTelemetryEvent } from './telemetry';
import { EventName } from './telemetry/constants';
import { IExtensionApi } from './apiTypes';
import { commands, window } from 'vscode';
import { getDebugpyPackagePath } from './debugger/adapter/remoteLaunchers';

export async function activate(context: IExtensionContext): Promise<IExtensionApi | undefined> {
    const outputChannel = createOutputChannel('Python Debugger');
    context.subscriptions.push(outputChannel, registerLogger(outputChannel));
    context.subscriptions.push(registerCommand(Commands.ViewOutput, () => outputChannel.show()));

    context.subscriptions.push(
        commands.registerCommand('python.getDebugpyPackagePath', () => {
            return getDebugpyPackagePath();
        }),
    );

    try {
        const api = await registerDebugger(context);
        sendTelemetryEvent(EventName.DEBUG_SUCCESS_ACTIVATION);
        return api;
    } catch (ex) {
        traceError('Python Debugger activation failed.', ex);
        window
            .showErrorMessage(
                'Python Debugger failed to activate. Reload and repair the extension to recover.',
                'Reload and Repair',
            )
            .then((selection) => {
                if (selection === 'Reload and Repair') {
                    commands.executeCommand(Commands.ClearStorage).then(
                        undefined,
                        () => commands.executeCommand('workbench.action.reloadWindow'),
                    );
                }
            });
        return undefined;
    }
}
