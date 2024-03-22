/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as path from 'path';
import { Uri } from 'vscode';
import { DebugConfigStrings } from '../../../common/utils/localize';
import { MultiStepInput } from '../../../common/multiStepInput';
import { DebuggerTypeName } from '../../../constants';
import { LaunchRequestArguments } from '../../../types';
import { DebugConfigurationState } from '../../types';
import { getFlaskPaths } from '../utils/configuration';
import { QuickPickType } from './providerQuickPick/types';
import { goToFileButton } from './providerQuickPick/providerQuickPick';
import { parseFlaskPath, pickFlaskPrompt } from './providerQuickPick/flaskProviderQuickPick';

export async function buildFlaskLaunchDebugConfiguration(
    input: MultiStepInput<DebugConfigurationState>,
    state: DebugConfigurationState,
): Promise<void> {
    let flaskPaths = await getFlaskPaths(state.folder);
    let options: QuickPickType[] = [];

    const config: Partial<LaunchRequestArguments> = {
        name: DebugConfigStrings.flask.snippet.name,
        type: DebuggerTypeName,
        request: 'launch',
        module: 'flask',
        env: {
            FLASK_APP: 'app.py',
            FLASK_DEBUG: '1',
        },
        args: ['run', '--no-debugger', '--no-reload'],
        jinja: true,
        autoStartBrowser: false,
    };

    //add found paths to options
    if (flaskPaths.length > 0) {
        options.push(
            ...flaskPaths.map((item) => ({
                label: path.basename(item.fsPath),
                filePath: item,
                description: parseFlaskPath(state.folder, item.fsPath),
                buttons: [goToFileButton],
            })),
        );
    } else {
        const managePath = path.join(state?.folder?.uri.fsPath || '', 'app.py');
        options.push({
            label: 'Default',
            description: parseFlaskPath(state.folder, managePath),
            filePath: Uri.file(managePath),
        });
    }
    await input.run((_input, state) => pickFlaskPrompt(input, state, config, options), state);
}
