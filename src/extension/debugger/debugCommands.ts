// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';
import { DebugConfiguration, Uri } from 'vscode';
import { DebugPurpose, LaunchRequestArguments } from '../types';
import { getConfigurationsByUri } from './configuration/launch.json/launchJsonReader';
import { DebuggerTypeName } from '../constants';

export async function getDebugConfiguration(uri?: Uri): Promise<DebugConfiguration> {
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
        type: DebuggerTypeName,
        request: 'launch',
        program: uri?.fsPath ?? '${file}',
        console: 'integratedTerminal',
    };
}
