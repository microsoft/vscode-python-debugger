'use strict';

// import * as vscode from 'vscode';

// This line should always be right on top.

if ((Reflect as any).metadata === undefined) {
    require('reflect-metadata');
}

import { registerDebugger } from './extensionInit';
import { IExtensionContext } from './common/types';
import { createOutputChannel, registerCommand } from './common/vscodeapi';
import { Commands } from './common/constants';
import { registerLogger, traceError, traceLog } from './common/log/logging';
import { sendTelemetryEvent } from './telemetry';
import { EventName } from './telemetry/constants';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: IExtensionContext): Promise<void> {
    // Setup logging
    const outputChannel = createOutputChannel('Python Debugger');
    context.subscriptions.push(outputChannel, registerLogger(outputChannel));
    context.subscriptions.push(registerCommand(Commands.ViewOutput, () => outputChannel.show()));

    traceLog(`Name: Python Debugger`);
    traceLog(`Module: debugpy`);

    try {
        await registerDebugger(context);
        sendTelemetryEvent(EventName.DEBUG_SUCCESS_ACTIVATION);
    } catch (ex) {
        traceError('sendDebugpySuccessActivationTelemetry() failed.', ex);
    }
}

// this method is called when your extension is deactivated
export function deactivate() {}
