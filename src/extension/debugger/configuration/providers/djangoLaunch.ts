// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { QuickPick, QuickPickItemButtonEvent, QuickPickItemKind, Uri, WorkspaceFolder, window } from 'vscode';
import * as path from 'path';
import { IQuickPickParameters, InputFlowAction, MultiStepInput } from '../../../common/multiStepInput';
import { sendTelemetryEvent } from '../../../telemetry';
import { EventName } from '../../../telemetry/constants';
import { DebuggerTypeName } from '../../../constants';
import { LaunchRequestArguments } from '../../../types';
import { DebugConfigurationState, DebugConfigurationType } from '../../types';
import { DebugConfigStrings } from '../../../common/utils/localize';
import { getDjangoPaths } from '../utils/configuration';
import { browseFileOption, goToFileButton, openFileExplorer } from './pathQuickPick/providerPicker';
import { QuickPickType } from './pathQuickPick/types';

const workspaceFolderToken = '${workspaceFolder}';

export async function buildDjangoLaunchDebugConfiguration(
    input: MultiStepInput<DebugConfigurationState>,
    state: DebugConfigurationState,
): Promise<void> {
    const config: Partial<LaunchRequestArguments> = {
        name: DebugConfigStrings.django.snippet.name,
        type: DebuggerTypeName,
        request: 'launch',
        args: ['runserver'],
        django: true,
        autoStartBrowser: false,
    };

    let djangoPaths = await getDjangoPaths(state.folder);

    let options: QuickPickType[] = [];

    //add found paths to options
    if (djangoPaths.length > 0) {
        options.push(
            ...djangoPaths.map((item) => ({
                label: path.basename(item.fsPath),
                filePath: item,
                description: parseManagePyPath(state.folder, item.fsPath),
                buttons: [goToFileButton],
            })),
        );
    } else {
        const managePath = path.join(state?.folder?.uri.fsPath || '', 'manage.py');
        options.push({
            label: 'manage.py',
            description: parseManagePyPath(state.folder, managePath),
            filePath: Uri.file(managePath),
        });
    }
    await input.run((input, s) => pickDjangoPrompt(input, s, config, options), state);
}

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
        activeItem: options[0],
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
    if (baseManagePath) {
        return `${workspaceFolderToken}${path.sep}${baseManagePath}`;
    } else {
        return djangoPath;
    }
}
