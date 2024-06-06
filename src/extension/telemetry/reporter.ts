// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import TelemetryReporter from '@vscode/extension-telemetry';
import { AppinsightsKey, isTestExecution } from '../common/constants';

export function getTelemetryReporter(telemetryReporter: TelemetryReporter | undefined) {
    if (!isTestExecution() && telemetryReporter) {
        return telemetryReporter;
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const Reporter = require('@vscode/extension-telemetry').default as typeof TelemetryReporter;
    telemetryReporter = new Reporter(AppinsightsKey, [
        {
            lookup: /(errorName|errorMessage|errorStack)/g,
        },
    ]);

    return telemetryReporter;
}
