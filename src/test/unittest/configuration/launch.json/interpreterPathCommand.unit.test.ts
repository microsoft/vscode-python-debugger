// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import * as TypeMoq from 'typemoq';
import { Uri } from 'vscode';
import * as pythonApi from '../../../../extension/common/python';
import { IDisposable } from '../../../../extension/common/types';
import * as vscodeapi from '../../../../extension/common/vscodeapi';
import { InterpreterPathCommand } from '../../../../extension/debugger/configuration/launch.json/interpreterPathCommand';
import { Environment } from '../../../../extension/common/pythonTypes';

suite('Interpreter Path Command', () => {
    let interpreterPathCommand: InterpreterPathCommand;
    let registerCommandStub: sinon.SinonStub;
    let getInterpreterDetailsStub: sinon.SinonStub;
    setup(() => {
        registerCommandStub = sinon.stub(vscodeapi, 'registerCommand');
        interpreterPathCommand = new InterpreterPathCommand();
        getInterpreterDetailsStub = sinon.stub(pythonApi, 'getInterpreterDetails');
    });

    teardown(() => {
        sinon.restore();
    });
    test('If `workspaceFolder` property exists in `args`, it is used to retrieve setting from config', async () => {
        const args = { workspaceFolder: 'folderPath' };

        getInterpreterDetailsStub.callsFake((arg) => {
            assert.deepEqual(arg, Uri.parse('folderPath'));
            return Promise.resolve({ path: ['settingValue'] }) as unknown;
        });
        // getInterpreterDetailsStub.onCall(1).callsFake((arg) => {
        //     assert.deepEqual(arg, Uri.parse('folderPath'));
        //     return Promise.resolve({ path: 'settingValue' }) as unknown;
        // });
        // when(interpreterService.getActiveInterpreter(anything())).thenCall((arg) => {
        //     assert.deepEqual(arg, Uri.parse('folderPath'));

        //     return Promise.resolve({ path: 'settingValue' }) as unknown;
        // });
        const setting = await interpreterPathCommand._getSelectedInterpreterPath(args);
        expect(setting).to.equal('settingValue');
    });

    test('If `args[1]` is defined, it is used to retrieve setting from config', async () => {
        const args = ['command', 'folderPath'];
        getInterpreterDetailsStub.callsFake((arg) => {
            assert.deepEqual(arg, Uri.parse('folderPath'));
            return Promise.resolve({ path: ['settingValue'] }) as unknown;
        });

        const setting = await interpreterPathCommand._getSelectedInterpreterPath(args);
        expect(setting).to.equal('settingValue');
    });

    test('If neither of these exists, value of workspace folder is `undefined`', async () => {
        const args = ['command'];

        // when(interpreterService.getActiveInterpreter(undefined)).thenReturn(
        //     Promise.resolve({ path: 'settingValue' }) as Promise<PythonEnvironment | undefined>,
        // );
        getInterpreterDetailsStub
            .withArgs(undefined)
            .resolves({ path: ['settingValue'] } as unknown as Environment | undefined);
        const setting = await interpreterPathCommand._getSelectedInterpreterPath(args);
        expect(setting).to.equal('settingValue');
    });

    test('If `args[1]` is not a valid uri', async () => {
        const args = ['command', '${input:some_input}'];
        getInterpreterDetailsStub.callsFake((arg) => {
            assert.deepEqual(arg, undefined);
            return Promise.resolve({ path: ['settingValue'] }) as unknown;
        });
        const setting = await interpreterPathCommand._getSelectedInterpreterPath(args);
        expect(setting).to.equal('settingValue');
    });
});
