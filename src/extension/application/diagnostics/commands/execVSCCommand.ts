// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { executeCommand } from '../../../common/vscodeapi';
import { sendTelemetryEvent } from '../../../telemetry';
import { EventName } from '../../../telemetry/constants';
import { CommandsWithoutArgs } from '../../../common/application/commands';
import { IDiagnostic } from '../types';
import { BaseDiagnosticCommand } from './base';

export class ExecuteVSCCommand extends BaseDiagnosticCommand {
    constructor(
        diagnostic: IDiagnostic,
        private commandName: CommandsWithoutArgs,
    ) {
        super(diagnostic);
    }
    public async invoke(): Promise<void> {
        sendTelemetryEvent(EventName.DIAGNOSTICS_ACTION, undefined, { commandName: this.commandName });
        return executeCommand(this.commandName).then(() => undefined);
    }
}
