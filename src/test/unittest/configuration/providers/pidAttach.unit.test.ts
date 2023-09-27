// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as path from 'path';
import { Uri } from 'vscode';
import { MultiStepInput } from '../../../../extension/common/multiStepInput';
import { DebugConfigStrings } from '../../../../extension/common/utils/localize';
import { DebuggerTypeName } from '../../../../extension/constants';
import { buildPidAttachConfiguration } from '../../../../extension/debugger/configuration/providers/pidAttach';
import { DebugConfigurationState } from '../../../../extension/debugger/types';

suite('Debugging - Configuration Provider File', () => {
    test('Launch JSON with default process id', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };

        await buildPidAttachConfiguration(undefined as unknown as MultiStepInput<DebugConfigurationState>, state);

        const config = {
            name: DebugConfigStrings.attachPid.snippet.name,
            type: DebuggerTypeName,
            request: 'attach',
            processId: '${command:pickProcess}',
        };

        expect(state.config).to.be.deep.equal(config);
    });
});
