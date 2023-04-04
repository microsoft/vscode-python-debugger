// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as assert from 'assert';
import * as sinon from 'sinon';
import { instance, mock } from 'ts-mockito';
import { Disposable } from 'vscode';
import { Commands } from '../../../extension/common/constants';
import { ProcessServiceFactory } from '../../../extension/common/process/processFactory';
import { IProcessServiceFactory } from '../../../extension/common/process/types';
import { IDisposableRegistry } from '../../../extension/common/types';
import { AttachProcessProviderFactory } from '../../../extension/debugger/attachQuickPick/factory';
import * as vscodeapi from '../../../extension/common/vscodeapi';

suite('Attach to process - attach process provider factory', () => {
    let processServiceFactory: IProcessServiceFactory;
    let disposableRegistry: IDisposableRegistry;
    let factory: AttachProcessProviderFactory;
    let registerCommandStub: sinon.SinonStub;

    setup(() => {
        processServiceFactory = mock(ProcessServiceFactory);
        disposableRegistry = [];
        registerCommandStub = sinon.stub(vscodeapi, 'registerCommand');

        factory = new AttachProcessProviderFactory(instance(processServiceFactory), disposableRegistry);
    });

    test('Register commands should not fail', () => {
        factory.registerCommands();
        sinon.assert.calledOnceWithExactly(
            registerCommandStub,
            Commands.PickLocalProcess,
            sinon.match.any,
            sinon.match.any,
        );
        assert.strictEqual((disposableRegistry as Disposable[]).length, 1);
    });
});
