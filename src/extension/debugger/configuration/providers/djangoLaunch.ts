// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { Uri } from 'vscode';
import * as path from 'path';
import { MultiStepInput } from '../../../common/multiStepInput';
import { DebuggerTypeName } from '../../../constants';
import { LaunchRequestArguments } from '../../../types';
import { DebugConfigurationState } from '../../types';
import { DebugConfigStrings } from '../../../common/utils/localize';
import { getDjangoPaths } from '../utils/configuration';
import { goToFileButton } from './providerQuickPick/providerQuickPick';
import { QuickPickType } from './providerQuickPick/types';
import { parseManagePyPath, pickDjangoPrompt } from './providerQuickPick/djangoProviderQuickPick';

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
            label: 'Default',
            description: parseManagePyPath(state.folder, managePath),
            filePath: Uri.file(managePath),
        });
    }
    await input.run((_input, state) => pickDjangoPrompt(input, state, config, options), state);
}
