// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as path from 'path';
import { Uri } from 'vscode';
import { MultiStepInput } from '../../../../extension/common/multiStepInput';
import { DebugConfigStrings } from '../../../../extension/common/utils/localize';
import { DebuggerTypeName } from '../../../../extension/constants';
import { buildFileWithArgsLaunchDebugConfiguration } from '../../../../extension/debugger/configuration/providers/fileLaunchWithArgs';
import { DebugConfigurationState } from '../../../../extension/debugger/types';

suite('Debugging - Configuration Provider File with Arguments', () => {
    test('Launch JSON with default config', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };

        await buildFileWithArgsLaunchDebugConfiguration(
            undefined as unknown as MultiStepInput<DebugConfigurationState>,
            state,
        );

        const config = {
            name: DebugConfigStrings.fileWithArgs.snippet.name,
            type: DebuggerTypeName,
            request: 'launch',
            program: '${file}',
            console: 'integratedTerminal',
            args: ['${command:pickArgs}'],
        };

        expect(state.config).to.be.deep.equal(config);
    });
});
