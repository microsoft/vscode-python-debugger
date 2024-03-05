// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { DebugAdapterTracker, DebugAdapterTrackerFactory, DebugSession, ProviderResult } from 'vscode';
import { DebugProtocol } from '@vscode/debugprotocol';
import { IEventNamePropertyMapping, sendTelemetryEvent } from '../../telemetry';
import { EventName } from '../../telemetry/constants';
import { TriggerType, AttachRequestArguments, ConsoleType, LaunchRequestArguments } from '../../types';
import { StopWatch } from '../utils/stopWatch';

function isResponse(a: any): a is DebugProtocol.Response {
    return a.type === 'response';
}
class TelemetryTracker implements DebugAdapterTracker {
    private timer = new StopWatch();
    private readonly trigger: TriggerType = 'launch';
    private readonly console: ConsoleType | undefined;

    constructor(session: DebugSession) {
        this.trigger = session.configuration.request as TriggerType;
        const debugConfiguration = session.configuration as Partial<LaunchRequestArguments & AttachRequestArguments>;
        this.console = debugConfiguration.console;
    }

    public onWillStartSession() {
        this.sendTelemetry(EventName.DEBUG_SESSION_START);
    }

    public onDidSendMessage(message: any): void {
        if (isResponse(message)) {
            if (message.command === 'configurationDone') {
                // "configurationDone" response is sent immediately after user code starts running.
                this.sendTelemetry(EventName.DEBUG_SESSION_USER_CODE_RUNNING);
            }
        }
    }

    public onWillStopSession(): void {
        this.sendTelemetry(EventName.DEBUG_SESSION_STOP);
    }

    public onError?(error: Error): void {
        this.sendTelemetry(EventName.DEBUG_SESSION_ERROR, error);
    }

    private sendTelemetry<P extends IEventNamePropertyMapping, E extends keyof P>(
        eventName: EventName,
        properties?: P[E],
    ): void {
        if (eventName === EventName.DEBUG_SESSION_START) {
            this.timer.reset();
        }
        const telemetryProps = {
            trigger: this.trigger,
            console: this.console,
            ...properties,
        };
        sendTelemetryEvent(eventName as keyof IEventNamePropertyMapping, this.timer.elapsedTime, telemetryProps);
    }
}

export class DebugSessionTelemetry implements DebugAdapterTrackerFactory {
    public readonly supportedWorkspaceTypes = { untrustedWorkspace: false, virtualWorkspace: true };
    constructor() {}

    public createDebugAdapterTracker(session: DebugSession): ProviderResult<DebugAdapterTracker> {
        return new TelemetryTracker(session);
    }
}
