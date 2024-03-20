// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { ThemeIcon, Uri } from 'vscode';
import { expect } from 'chai';
import * as path from 'path';
import * as typemoq from 'typemoq';
import * as sinon from 'sinon';
import { MultiStepInput } from '../../../../extension/common/multiStepInput';
import { DebugConfigurationState } from '../../../../extension/debugger/types';
import * as djangoLaunch from '../../../../extension/debugger/configuration/providers/djangoLaunch';
import * as configuration from '../../../../extension/debugger/configuration/utils/configuration';
import * as djangoProviderQuickPick from '../../../../extension/debugger/configuration/providers/providerQuickPick/djangoProviderQuickPick';

suite('Debugging - Configuration Provider Django', () => {
    let pathSeparatorStub: sinon.SinonStub;
    let getDjangoPathsStub: sinon.SinonStub;
    let pickDjangoPromptStub: sinon.SinonStub;
    let multiStepInput: typemoq.IMock<MultiStepInput<DebugConfigurationState>>;

    setup(() => {
        multiStepInput = typemoq.Mock.ofType<MultiStepInput<DebugConfigurationState>>();
        multiStepInput
            .setup((i) => i.run(typemoq.It.isAny(), typemoq.It.isAny()))
            .returns((callback, _state) => callback());
        pathSeparatorStub = sinon.stub(path, 'sep');
        getDjangoPathsStub = sinon.stub(configuration, 'getDjangoPaths');
        pickDjangoPromptStub = sinon.stub(djangoProviderQuickPick, 'pickDjangoPrompt');
        pathSeparatorStub.value('-');
    });
    teardown(() => {
        sinon.restore();
    });
    test('Show picker and send parsed found managepy paths', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };
        const managePath = Uri.file(path.join(folder.uri.fsPath, 'manage.py'));
        getDjangoPathsStub.resolves([managePath]);
        pickDjangoPromptStub.resolves();
        await djangoLaunch.buildDjangoLaunchDebugConfiguration(multiStepInput.object, state);
        const options = pickDjangoPromptStub.getCall(0).args[3];
        const expectedOptions = [
            {
                label: path.basename(managePath.fsPath),
                filePath: managePath,
                description: `${djangoProviderQuickPick.workspaceFolderToken}-manage.py`,
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
    test('Show picker and send defauge managepy path', async () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const state = { config: {}, folder };
        const managePath = path.join(state?.folder?.uri.fsPath, 'manage.py');
        getDjangoPathsStub.resolves([]);
        pickDjangoPromptStub.resolves();
        await djangoLaunch.buildDjangoLaunchDebugConfiguration(multiStepInput.object, state);
        const options = pickDjangoPromptStub.getCall(0).args[3];
        const expectedOptions = [
            {
                label: 'Default',
                filePath: Uri.file(managePath),
                description: `${djangoProviderQuickPick.workspaceFolderToken}-manage.py`,
            },
        ];

        expect(options).to.be.deep.equal(expectedOptions);
    });
});
