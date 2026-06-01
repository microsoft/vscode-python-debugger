// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as path from 'path';
import { MultiStepInput } from '../../../common/multiStepInput';
import { DebugConfigStrings } from '../../../common/utils/localize';
import { sendTelemetryEvent } from '../../../telemetry';
import { EventName } from '../../../telemetry/constants';
import { DebuggerTypeName } from '../../../constants';
import { LaunchRequestArguments } from '../../../types';
import { DebugConfigurationState, DebugConfigurationType } from '../../types';
import { getFastApiPaths, tryResolveFastApiArgs } from '../utils/configuration';

async function promptForAppPath(
    input: MultiStepInput<DebugConfigurationState>,
    value?: string,
): Promise<string | undefined> {
    const entered = await input.showInputBox({
        title: DebugConfigStrings.fastapi.enterAppPath.title,
        prompt: DebugConfigStrings.fastapi.enterAppPath.prompt,
        value: value ?? '',
        validate: (v) =>
            Promise.resolve(v && v.trim().length > 0 ? undefined : DebugConfigStrings.fastapi.enterAppPath.invalid),
    });
    return entered?.trim();
}

export async function buildFastAPILaunchDebugConfiguration(
    input: MultiStepInput<DebugConfigurationState>,
    state: DebugConfigurationState,
): Promise<void> {
    const fastApiPaths = await getFastApiPaths(state.folder);
    const autoArgs = state.folder ? tryResolveFastApiArgs(state.folder, fastApiPaths) : undefined;

    let args: string[];
    if (autoArgs) {
        args = autoArgs;
    } else {
        const workspaceRoot = state.folder?.uri.fsPath;
        const prefill =
            workspaceRoot && fastApiPaths.length > 0 ? path.relative(workspaceRoot, fastApiPaths[0].fsPath) : undefined;
        const entered = await promptForAppPath(input, prefill);
        if (!entered) {
            return;
        }
        args = ['run', entered];
    }

    const config: Partial<LaunchRequestArguments> = {
        name: DebugConfigStrings.fastapi.snippet.name,
        type: DebuggerTypeName,
        request: 'launch',
        module: 'fastapi',
        args,
        jinja: true,
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
        args: ['run', '${file}'],
        jinja: true,
    };
    sendTelemetryEvent(EventName.DEBUGGER_CONFIGURATION_PROMPTS, undefined, {
        configurationType: DebugConfigurationType.launchFastAPIWithFile,
    });
    Object.assign(state.config, config);
}
