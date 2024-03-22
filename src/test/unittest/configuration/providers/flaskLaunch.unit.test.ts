// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import * as typemoq from 'typemoq';
import { ThemeIcon, Uri } from 'vscode';
import { DebugConfigurationState } from '../../../../extension/debugger/types';
import * as flaskLaunch from '../../../../extension/debugger/configuration/providers/flaskLaunch';
import { MultiStepInput } from '../../../../extension/common/multiStepInput';
import * as configuration from '../../../../extension/debugger/configuration/utils/configuration';
import * as flaskProviderQuickPick from '../../../../extension/debugger/configuration/providers/providerQuickPick/flaskProviderQuickPick';

suite('Debugging - Configuration Provider Flask', () => {
    let multiStepInput: typemoq.IMock<MultiStepInput<DebugConfigurationState>>;
    let getFlaskPathsStub: sinon.SinonStub;
    let pickFlaskPromptStub: sinon.SinonStub;

    setup(() => {
        multiStepInput = typemoq.Mock.ofType<MultiStepInput<DebugConfigurationState>>();
        multiStepInput
            .setup((i) => i.run(typemoq.It.isAny(), typemoq.It.isAny()))
            .returns((callback, _state) => callback());
        getFlaskPathsStub = sinon.stub(configuration, 'getFlaskPaths');
        pickFlaskPromptStub = sinon.stub(flaskProviderQuickPick, 'pickFlaskPrompt');
    });
    teardown(() => {
        sinon.restore();
    });
    test('Show picker and send parsed found flask paths', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };
        const appPath = Uri.file(path.join(folder.uri.fsPath, 'app.py'));
        getFlaskPathsStub.resolves([appPath]);
        pickFlaskPromptStub.resolves();
        await flaskLaunch.buildFlaskLaunchDebugConfiguration(multiStepInput.object, state);
        const options = pickFlaskPromptStub.getCall(0).args[3];
        const expectedOptions = [
            {
                label: path.basename(appPath.fsPath),
                filePath: appPath,
                description: 'app.py',
                buttons: [
                    {
                        iconPath: new ThemeIcon('go-to-file'),
                        tooltip: `Open in Preview`,
                    },
                ],
            },
        ];

        expect(options).to.be.deep.equal(expectedOptions);
    });
    test('Show picker and send default app.py path', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };
        const appPath = path.join(state?.folder?.uri.fsPath, 'app.py');
        getFlaskPathsStub.resolves([]);
        pickFlaskPromptStub.resolves();
        await flaskLaunch.buildFlaskLaunchDebugConfiguration(multiStepInput.object, state);
        const options = pickFlaskPromptStub.getCall(0).args[3];
        const expectedOptions = [
            {
                label: 'Default',
                filePath: Uri.file(appPath),
                description: 'app.py',
            },
        ];

        expect(options).to.be.deep.equal(expectedOptions);
    });
});
