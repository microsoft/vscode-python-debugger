'use strict';

import { registerDebugger } from './extensionInit';
import { IExtensionContext } from './common/types';
import { createOutputChannel, registerCommand } from './common/vscodeapi';
import { Commands } from './common/constants';
import { registerLogger, traceError } from './common/log/logging';
import { sendTelemetryEvent } from './telemetry';
import { EventName } from './telemetry/constants';
import { IExtensionApi } from './apiTypes';

export async function activate(context: IExtensionContext): Promise<IExtensionApi | undefined> {
    const outputChannel = createOutputChannel('Python Debugger');
    context.subscriptions.push(outputChannel, registerLogger(outputChannel));
    context.subscriptions.push(registerCommand(Commands.ViewOutput, () => outputChannel.show()));

    try {
        const api = await registerDebugger(context);
        sendTelemetryEvent(EventName.DEBUG_SUCCESS_ACTIVATION);
        return api;
    } catch (ex) {
        traceError('sendDebugpySuccessActivationTelemetry() failed.', ex);
        throw ex; // re-raise
    }
}
