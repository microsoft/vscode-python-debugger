// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import { instance, mock } from 'ts-mockito';
import { Uri } from 'vscode';
import * as path from 'path';
import { DebugConfigStrings } from '../../../../extension/common/utils/localize';
import { DebuggerTypeName } from '../../../../extension/constants';
import * as fastApiLaunch from '../../../../extension/debugger/configuration/providers/fastapiLaunch';
import { DebugConfigurationState } from '../../../../extension/debugger/types';
import { MultiStepInput } from '../../../../extension/common/multiStepInput';

suite('Debugging - Configuration Provider FastAPI', () => {
    let input: MultiStepInput<DebugConfigurationState>;

    setup(() => {
        input = mock<MultiStepInput<DebugConfigurationState>>(MultiStepInput);
    });

    test('Launch JSON with default configuration', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };

        await fastApiLaunch.buildFastAPILaunchDebugConfiguration(instance(input), state);

        const config = {
            name: DebugConfigStrings.fastapi.snippet.name,
            type: DebuggerTypeName,
            request: 'launch',
            module: 'fastapi',
            args: ['run'],
            jinja: true,
        };

        expect(state.config).to.be.deep.equal(config);
    });

    test('Launch JSON with file configuration', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };

        await fastApiLaunch.buildFastAPIWithFileLaunchDebugConfiguration(instance(input), state);

        const config = {
            name: DebugConfigStrings.fastapi.snippetFile.name,
            type: DebuggerTypeName,
            request: 'launch',
            module: 'fastapi',
            args: ['run', '${file}'],
            jinja: true,
        };

        expect(state.config).to.be.deep.equal(config);
    });
});
