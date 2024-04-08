// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';
import { window, QuickPickItemButtonEvent, QuickPickItemKind, WorkspaceFolder } from 'vscode';
import { IQuickPickParameters, InputFlowAction, MultiStepInput } from '../../../../common/multiStepInput';
import { LaunchRequestArguments } from '../../../../types';
import { DebugConfigurationState, DebugConfigurationType } from '../../../types';
import { QuickPickType } from './types';
import { browseFileOption, openFileExplorer } from './providerQuickPick';
import { DebugConfigStrings } from '../../../../common/utils/localize';
import { sendTelemetryEvent } from '../../../../telemetry';
import { EventName } from '../../../../telemetry/constants';

export const workspaceFolderToken = '${workspaceFolder}';

export async function pickDjangoPrompt(
    input: MultiStepInput<DebugConfigurationState>,
    state: DebugConfigurationState,
    config: Partial<LaunchRequestArguments>,
    pathsOptions: QuickPickType[],
) {
    let options: QuickPickType[] = [
        ...pathsOptions,
        { label: '', kind: QuickPickItemKind.Separator },
        browseFileOption,
    ];

    const selection = await input.showQuickPick<QuickPickType, IQuickPickParameters<QuickPickType>>({
        placeholder: DebugConfigStrings.django.djangoConfigPromp.prompt,
        items: options,
        acceptFilterBoxTextAsSelection: true,
        matchOnDescription: true,
        title: DebugConfigStrings.django.djangoConfigPromp.title,
        onDidTriggerItemButton: async (e: QuickPickItemButtonEvent<QuickPickType>) => {
            if (e.item && 'filePath' in e.item) {
                await window.showTextDocument(e.item.filePath, { preview: true });
            }
        },
    });

    if (selection === undefined) {
        return;
    } else if (selection.label === browseFileOption.label) {
        const uris = await openFileExplorer(state.folder?.uri);
        if (uris && uris.length > 0) {
            config.program = parseManagePyPath(state.folder, uris[0].fsPath);
            sendTelemetryEvent(EventName.DEBUGGER_CONFIGURATION_PROMPTS, undefined, {
                configurationType: DebugConfigurationType.launchDjango,
                browsefilevalue: true,
            });
        } else {
            return Promise.reject(InputFlowAction.resume);
        }
    } else if (typeof selection === 'string') {
        config.program = selection;
        sendTelemetryEvent(EventName.DEBUGGER_CONFIGURATION_PROMPTS, undefined, {
            configurationType: DebugConfigurationType.launchDjango,
            manuallyEnteredAValue: true,
        });
    } else {
        config.program = selection.description;
        sendTelemetryEvent(EventName.DEBUGGER_CONFIGURATION_PROMPTS, undefined, {
            configurationType: DebugConfigurationType.launchDjango,
            autoDetectedDjangoManagePyPath: true,
        });
    }
    Object.assign(state.config, config);
}

export function parseManagePyPath(folder: WorkspaceFolder | undefined, djangoPath: string): string | undefined {
    if (!folder) {
        return djangoPath;
    }
    const baseManagePath = path.relative(folder.uri.fsPath, djangoPath);
    if (baseManagePath && !baseManagePath.startsWith('..')) {
        return `${workspaceFolderToken}${path.sep}${baseManagePath}`;
    } else {
        return djangoPath;
    }
}
