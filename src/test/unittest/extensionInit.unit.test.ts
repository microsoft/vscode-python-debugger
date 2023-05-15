// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as typemoq from 'typemoq';
import {
    debug
} from 'vscode';
import { instance, mock } from 'ts-mockito';
import { IExtensionContext, IPersistentStateFactory } from '../../extension/common/types';
import { registerDebugger } from '../../extension/extensionInit';
import * as vscodeapi from '../../extension/common/vscodeapi';
import { Commands } from '../../extension/common/constants';
import { IDebugAdapterDescriptorFactory, IDebugSessionLoggingFactory, IOutdatedDebuggerPromptFactory } from '../../extension/debugger/types';
import { DebugSessionLoggingFactory } from '../../extension/debugger/adapter/logging';
import { OutdatedDebuggerPromptFactory } from '../../extension/debugger/adapter/outdatedDebuggerPrompt';
import { DebugAdapterDescriptorFactory } from '../../extension/debugger/adapter/factory';
import { expect } from 'chai';
import { PersistentStateFactory } from '../../extension/common/persistentState';


suite('Debugging - register Debugging', () => {
    let context: typemoq.IMock<IExtensionContext>;
    let registerCommandStub: sinon.SinonStub;
    let registerDebugAdapterTrackerFactoryStub:sinon.SinonStub;
    let registerDebugAdapterDescriptorFactoryStub:sinon.SinonStub;
    let loggingFactory: IDebugSessionLoggingFactory;
    let debuggerPromptFactory: IOutdatedDebuggerPromptFactory;
    let descriptorFactory: IDebugAdapterDescriptorFactory;
    let persistantState: IPersistentStateFactory

    setup(() => {
        context = typemoq.Mock.ofType<IExtensionContext>();
        registerCommandStub = sinon.stub(vscodeapi, 'registerCommand');
        registerDebugAdapterTrackerFactoryStub = sinon.stub(debug, 'registerDebugAdapterTrackerFactory');
        registerDebugAdapterDescriptorFactoryStub = sinon.stub(debug, 'registerDebugAdapterDescriptorFactory');
        loggingFactory = new DebugSessionLoggingFactory();
        debuggerPromptFactory = new OutdatedDebuggerPromptFactory();
        persistantState = new PersistentStateFactory(context.globalState, context.workspaceState);
        descriptorFactory = new DebugAdapterDescriptorFactory(persistantState);

        context.setup((c) => c.subscriptions).returns(() => []);
    });
    teardown(() => {
        sinon.restore();
    });

    test('Ensure to register all the commands related to the debugger', () => {
        registerDebugger(context.object);

        sinon.assert.calledWithExactly(
            registerCommandStub,
            Commands.Debug_In_Terminal,
            sinon.match.any
        );
        sinon.assert.calledWithExactly(
            registerCommandStub,
            Commands.PickLocalProcess,
            sinon.match.any
        );
        sinon.assert.calledWithExactly(
            registerCommandStub,
            Commands.SelectDebugConfig,
            sinon.match.any,
            sinon.match.any
        );
        sinon.assert.calledWithExactly(
            registerCommandStub,
            Commands.GetSelectedInterpreterPath,
            sinon.match.any,
        );
        sinon.assert.calledWithExactly(
            registerCommandStub,
            Commands.ClearStorage,
            sinon.match.any
        );
        expect(registerCommandStub.callCount).to.be.equal(5);
        // assert.strictEqual((context.object.subscriptions as vscode.Disposable[]).length, 1);
    });
    test('Register Debug adapter factory', async () => {
        registerDebugger(context.object);

        sinon.assert.calledWithExactly(registerDebugAdapterTrackerFactoryStub, 'debugpy', loggingFactory)

        sinon.assert.calledWithExactly(registerDebugAdapterTrackerFactoryStub, 'debugpy', debuggerPromptFactory)

        // verify(
        //     debugService.registerDebugAdapterDescriptorFactory('debugpy', instance(descriptorFactory)),
        // ).once();
        sinon.assert.calledWith(registerDebugAdapterDescriptorFactoryStub, 'debugpy', sinon.match.instanceOf(IDebugAdapterDescriptorFactory))
        
        expect(registerDebugAdapterTrackerFactoryStub.callCount).to.be.equal(2);
    });

    test('Register a disposable item', async () => {
        // const disposable = { dispose: noop };
        // when(debugService.registerDebugAdapterTrackerFactory(anything(), anything())).thenReturn(disposable);
        // when(debugService.registerDebugAdapterDescriptorFactory(anything(), anything())).thenReturn(disposable);
        // await activator.activate();
        // assert.deepEqual(disposableRegistry, [disposable, disposable, disposable]);
    });
});