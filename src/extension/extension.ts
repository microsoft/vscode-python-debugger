'use strict';

// import * as vscode from 'vscode';

// This line should always be right on top.

// if ((Reflect as any).metadata === undefined) {
//     require('reflect-metadata');
// }

import { registerDebugger } from './extensionInit';
import { IExtensionContext } from './common/types';
import { createOutputChannel, registerCommand } from './common/vscodeapi';
import { Commands } from './common/constants';
import { registerLogger, traceLog } from './common/log/logging';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: IExtensionContext): Promise<void> {

    // Setup logging
    const outputChannel = createOutputChannel('Debugpy');
    context.subscriptions.push(outputChannel, registerLogger(outputChannel));
    context.subscriptions.push(registerCommand(Commands.ViewOutput, () => outputChannel.show()));

    traceLog(`Name: Debugpy`);
    traceLog(`Module: debugpy`);

    await registerDebugger(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}
