// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TelemetryReporter } from '@vscode/extension-telemetry';
import { AppinsightsKey, isTestExecution } from '../common/constants';

export function getTelemetryReporter(telemetryReporter: TelemetryReporter | undefined) {
    if (!isTestExecution() && telemetryReporter) {
        return telemetryReporter;
    }

    telemetryReporter = new TelemetryReporter(AppinsightsKey, [
        {
            lookup: /(errorName|errorMessage|errorStack)/g,
        },
    ]);

    return telemetryReporter;
}
