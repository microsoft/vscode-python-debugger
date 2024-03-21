// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { Uri } from 'vscode';
import { expect } from 'chai';
import * as path from 'path';
import * as typemoq from 'typemoq';
import * as sinon from 'sinon';
import { MultiStepInput } from '../../../../../extension/common/multiStepInput';
import { DebugConfigurationState } from '../../../../../extension/debugger/types';
import { parseFlaskPath } from '../../../../../extension/debugger/configuration/providers/providerQuickPick/flaskProviderQuickPick';

suite('Debugging - Configuration Provider Flask QuickPick', () => {
    let pathSeparatorStub: sinon.SinonStub;
    let multiStepInput: typemoq.IMock<MultiStepInput<DebugConfigurationState>>;

    setup(() => {
        multiStepInput = typemoq.Mock.ofType<MultiStepInput<DebugConfigurationState>>();
        multiStepInput
            .setup((i) => i.run(typemoq.It.isAny(), typemoq.It.isAny()))
            .returns((callback, _state) => callback());
        pathSeparatorStub = sinon.stub(path, 'sep');
        pathSeparatorStub.value('-');
    });
    teardown(() => {
        sinon.restore();
    });
    test('parseManagePyPath should parse the path and return it with workspaceFolderToken', () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const flaskPath = path.join(folder.uri.fsPath, 'app.py');
        const file = parseFlaskPath(folder, flaskPath);
        pathSeparatorStub.value('-');
        const expectedValue = `app.py`;
        expect(file).to.be.equal(expectedValue);
    });
    test('parseManagePyPath should return the same path if the workspace do not match', () => {
        const folder = { uri: Uri.parse(path.join('one', 'two')), name: '1', index: 0 };
        const flaskPath = 'random/path/app.py';
        const file = parseFlaskPath(folder, flaskPath);

        expect(file).to.be.equal(flaskPath);
    });
});
