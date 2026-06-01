// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import { anything, instance, mock, when } from 'ts-mockito';
import { Uri } from 'vscode';
import { DebugConfigStrings } from '../../../../extension/common/utils/localize';
import { DebuggerTypeName } from '../../../../extension/constants';
import * as fastApiLaunch from '../../../../extension/debugger/configuration/providers/fastapiLaunch';
import * as configurationUtils from '../../../../extension/debugger/configuration/utils/configuration';
import { DebugConfigurationState } from '../../../../extension/debugger/types';
import { MultiStepInput } from '../../../../extension/common/multiStepInput';

suite('Debugging - Configuration Provider FastAPI', () => {
    let input: MultiStepInput<DebugConfigurationState>;
    let getFastApiPathsStub: sinon.SinonStub;

    setup(() => {
        input = mock<MultiStepInput<DebugConfigurationState>>(MultiStepInput);
        getFastApiPathsStub = sinon.stub(configurationUtils, 'getFastApiPaths');
    });

    teardown(() => {
        sinon.restore();
    });

    test('Single match at workspace root → passes path explicitly', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };
        getFastApiPathsStub.resolves([Uri.parse(path.join('one', 'two', 'main.py'))]);

        await fastApiLaunch.buildFastAPILaunchDebugConfiguration(instance(input), state);

        const config = {
            name: DebugConfigStrings.fastapi.snippet.name,
            type: DebuggerTypeName,
            request: 'launch',
            module: 'fastapi',
            args: ['run', 'main.py'],
            jinja: true,
        };

        expect(state.config).to.be.deep.equal(config);
    });

    test('Single match in subdirectory → passes path explicitly', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };
        getFastApiPathsStub.resolves([Uri.parse(path.join('one', 'two', 'backend', 'app', 'main.py'))]);

        await fastApiLaunch.buildFastAPILaunchDebugConfiguration(instance(input), state);

        const config = {
            name: DebugConfigStrings.fastapi.snippet.name,
            type: DebuggerTypeName,
            request: 'launch',
            module: 'fastapi',
            args: ['run', path.join('backend', 'app', 'main.py')],
            jinja: true,
        };

        expect(state.config).to.be.deep.equal(config);
    });

    test('No matches → prompts the user and uses the entered path', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };
        getFastApiPathsStub.resolves([]);
        when(input.showInputBox(anything())).thenResolve('custom/main.py');

        await fastApiLaunch.buildFastAPILaunchDebugConfiguration(instance(input), state);

        const config = {
            name: DebugConfigStrings.fastapi.snippet.name,
            type: DebuggerTypeName,
            request: 'launch',
            module: 'fastapi',
            args: ['run', 'custom/main.py'],
            jinja: true,
        };

        expect(state.config).to.be.deep.equal(config);
    });

    test('Multiple matches → prompts the user and uses the entered path', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };
        getFastApiPathsStub.resolves([
            Uri.parse(path.join('one', 'two', 'svc-a', 'main.py')),
            Uri.parse(path.join('one', 'two', 'svc-b', 'main.py')),
        ]);
        when(input.showInputBox(anything())).thenResolve(path.join('svc-a', 'main.py'));

        await fastApiLaunch.buildFastAPILaunchDebugConfiguration(instance(input), state);

        const config = {
            name: DebugConfigStrings.fastapi.snippet.name,
            type: DebuggerTypeName,
            request: 'launch',
            module: 'fastapi',
            args: ['run', path.join('svc-a', 'main.py')],
            jinja: true,
        };

        expect(state.config).to.be.deep.equal(config);
    });

    test('User cancels prompt → config is not populated', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };
        getFastApiPathsStub.resolves([]);
        when(input.showInputBox(anything())).thenResolve(undefined);

        await fastApiLaunch.buildFastAPILaunchDebugConfiguration(instance(input), state);

        expect(state.config).to.be.deep.equal({});
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
