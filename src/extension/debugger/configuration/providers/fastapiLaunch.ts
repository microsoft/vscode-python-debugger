// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { MultiStepInput } from '../../../common/multiStepInput';
import { DebugConfigStrings } from '../../../common/utils/localize';
import { sendTelemetryEvent } from '../../../telemetry';
import { EventName } from '../../../telemetry/constants';
import { DebuggerTypeName } from '../../../constants';
import { LaunchRequestArguments } from '../../../types';
import { DebugConfigurationState, DebugConfigurationType } from '../../types';

export async function buildFastAPILaunchDebugConfiguration(
    _input: MultiStepInput<DebugConfigurationState>,
    state: DebugConfigurationState,
): Promise<void> {
    const config: Partial<LaunchRequestArguments> = {
        name: DebugConfigStrings.fastapi.snippet.name,
        type: DebuggerTypeName,
        request: 'launch',
        module: 'fastapi',
        args: ['dev'],
        jinja: true,
        subProcess: true,
    };
    sendTelemetryEvent(EventName.DEBUGGER_CONFIGURATION_PROMPTS, undefined, {
        configurationType: DebugConfigurationType.launchFastAPI,
    });
    Object.assign(state.config, config);
}

export async function buildFastAPIWithFileLaunchDebugConfiguration(
    _input: MultiStepInput<DebugConfigurationState>,
    state: DebugConfigurationState,
): Promise<void> {
    const config: Partial<LaunchRequestArguments> = {
        name: DebugConfigStrings.fastapi.snippetFile.name,
        type: DebuggerTypeName,
        request: 'launch',
        module: 'fastapi',
        args: ['dev', '${file}'],
        jinja: true,
        subProcess: true,
    };
    sendTelemetryEvent(EventName.DEBUGGER_CONFIGURATION_PROMPTS, undefined, {
        configurationType: DebugConfigurationType.launchFastAPIWithFile,
    });
    Object.assign(state.config, config);
}