// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isTestExecution } from './common/constants';
import { traceError } from './common/log/logging';
import { IStopWatch } from './common/utils/stopWatch';
import { sendTelemetryEvent } from './telemetry';
import { EventName } from './telemetry/constants';
import { IStartupDurations } from './types';

export async function sendStartupTelemetry(
    activatedPromise: Promise<any>,
    durations: IStartupDurations,
    stopWatch: IStopWatch,
) {
    if (isTestExecution()) {
        return;
    }

    try {
        await activatedPromise;
        durations.totalNonBlockingActivateTime = stopWatch.elapsedTime - durations.startActivateTime;
        sendTelemetryEvent(EventName.EDITOR_LOAD, durations);
    } catch (ex) {
        traceError('sendStartupTelemetry() failed.', ex);
    }
}
