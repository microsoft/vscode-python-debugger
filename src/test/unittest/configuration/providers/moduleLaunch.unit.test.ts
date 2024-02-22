// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as path from 'path';
import { anything, instance, mock, when } from 'ts-mockito';
import { Uri } from 'vscode';
import { MultiStepInput } from '../../../../extension/common/multiStepInput';
import { DebugConfigStrings } from '../../../../extension/common/utils/localize';
import { DebuggerTypeName } from '../../../../extension/constants';
import { buildModuleLaunchConfiguration } from '../../../../extension/debugger/configuration/providers/moduleLaunch';
import { DebugConfigurationState } from '../../../../extension/debugger/types';

suite('Debugging - Configuration Provider Module', () => {
    test('Launch JSON with default module name', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };
        const input = mock<MultiStepInput<DebugConfigurationState>>(MultiStepInput);

        when(input.showInputBox(anything())).thenResolve('enter-your-module-name');

        await buildModuleLaunchConfiguration(instance(input), state);

        const config = {
            name: DebugConfigStrings.module.snippet.name,
            type: DebuggerTypeName,
            request: 'launch',
            module: DebugConfigStrings.module.snippet.default,
        };

        expect(state.config).to.be.deep.equal(config);
    });
    test('Launch JSON with selected module name', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };
        const input = mock<MultiStepInput<DebugConfigurationState>>(MultiStepInput);

        when(input.showInputBox(anything())).thenResolve('hello');

        await buildModuleLaunchConfiguration(instance(input), state);

        const config = {
            name: DebugConfigStrings.module.snippet.name,
            type: DebuggerTypeName,
            request: 'launch',
            module: 'hello',
        };

        expect(state.config).to.be.deep.equal(config);
    });
});
