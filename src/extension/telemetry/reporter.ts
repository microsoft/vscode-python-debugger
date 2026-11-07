// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TelemetryReporter } from '@vscode/extension-telemetry';
import { AppinsightsKey } from '../common/constants';

let telemetryReporter: TelemetryReporter | undefined;

export function getTelemetryReporter(): TelemetryReporter {
    if (!telemetryReporter) {
        telemetryReporter = new TelemetryReporter(AppinsightsKey, [
            {
                lookup: /(errorName|errorMessage|errorStack)/g,
            },
        ]);
    }

    return telemetryReporter;
}

export async function clearTelemetryReporter(): Promise<void> {
    const reporter = telemetryReporter;
    telemetryReporter = undefined;
    await reporter?.dispose();
}
