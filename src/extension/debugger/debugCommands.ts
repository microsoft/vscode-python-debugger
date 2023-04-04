// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';
import { inject, injectable } from 'inversify';
import { DebugConfiguration, Uri } from 'vscode';

import { DebugPurpose, LaunchRequestArguments } from '../types';
import { getConfigurationsByUri } from './configuration/launch.json/launchJsonReader';
import { registerCommand, startDebugging } from '../common/vscodeapi';
import { Commands } from '../common/constants';
import { sendTelemetryEvent } from '../telemetry';
import { EventName } from '../telemetry/constants';
import { IExtensionSingleActivationService } from '../activation/types';
import { noop } from '../common/utils/misc';
import { getInterpreterDetails, runPythonExtensionCommand } from '../common/python';
import { IDisposableRegistry } from '../common/types';

@injectable()
export class DebugCommands implements IExtensionSingleActivationService {
    public readonly supportedWorkspaceTypes = { untrustedWorkspace: false, virtualWorkspace: false };

    constructor(
        @inject(IDisposableRegistry) private readonly disposables: IDisposableRegistry,
    ) {}

    public activate(): Promise<void> {
        this.disposables.push(
            registerCommand(Commands.Debug_In_Terminal, async (file?: Uri) => {
                sendTelemetryEvent(EventName.DEBUG_IN_TERMINAL_BUTTON);
                const interpreter = await getInterpreterDetails(file);
                if (!interpreter.path) {
                    runPythonExtensionCommand(Commands.TriggerEnvironmentSelection, file).then(noop, noop);
                    return;
                }
                const config = await DebugCommands.getDebugConfiguration(file);
                startDebugging(undefined, config);
            }),
        );
        return Promise.resolve();
    }

    private static async getDebugConfiguration(uri?: Uri): Promise<DebugConfiguration> {
        const configs = (await getConfigurationsByUri(uri)).filter((c) => c.request === 'launch');
        for (const config of configs) {
            if ((config as LaunchRequestArguments).purpose?.includes(DebugPurpose.DebugInTerminal)) {
                if (!config.program && !config.module && !config.code) {
                    // This is only needed if people reuse debug-test for debug-in-terminal
                    config.program = uri?.fsPath ?? '${file}';
                }
                // Ensure that the purpose is cleared, this is so we can track if people accidentally
                // trigger this via F5 or Start with debugger.
                config.purpose = [];
                return config;
            }
        }
        return {
            name: `Debug ${uri ? path.basename(uri.fsPath) : 'File'}`,
            type: 'python-debugger',
            request: 'launch',
            program: uri?.fsPath ?? '${file}',
            console: 'integratedTerminal',
        };
    }
}
