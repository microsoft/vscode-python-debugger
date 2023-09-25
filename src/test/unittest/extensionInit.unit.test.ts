// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as sinon from 'sinon';
import * as typemoq from 'typemoq';
import * as vscode from 'vscode';
import { IExtensionContext, IPersistentStateFactory } from '../../extension/common/types';
import { registerDebugger } from '../../extension/extensionInit';
import * as vscodeapi from '../../extension/common/vscodeapi';
import { Commands } from '../../extension/common/constants';
import {
    IDebugAdapterDescriptorFactory,
    IDebugSessionLoggingFactory,
    IOutdatedDebuggerPromptFactory,
} from '../../extension/debugger/types';
import { DebugSessionLoggingFactory } from '../../extension/debugger/adapter/logging';
import { OutdatedDebuggerPromptFactory } from '../../extension/debugger/adapter/outdatedDebuggerPrompt';
import { DebugAdapterDescriptorFactory } from '../../extension/debugger/adapter/factory';
import { expect } from 'chai';
import { PersistentStateFactory } from '../../extension/common/persistentState';
import { DebugSessionTelemetry } from '../../extension/common/application/debugSessionTelemetry';
import { LaunchJsonCompletionProvider } from '../../extension/debugger/configuration/launch.json/completionProvider';
import { debuggerTypeName } from '../common';

suite('Debugging - register Debugging', () => {
    let context: typemoq.IMock<IExtensionContext>;
    let registerCommandStub: sinon.SinonStub;
    let registerDebugAdapterTrackerFactoryStub: sinon.SinonStub;
    let registerDebugAdapterDescriptorFactoryStub: sinon.SinonStub;
    let registerCompletionItemProviderStub: sinon.SinonStub;
    let loggingFactory: IDebugSessionLoggingFactory;
    let debuggerPromptFactory: IOutdatedDebuggerPromptFactory;
    let descriptorFactory: IDebugAdapterDescriptorFactory;
    let persistantState: IPersistentStateFactory;
    let debugSessionTelemetry: vscode.DebugAdapterTrackerFactory;
    let completionProvider: LaunchJsonCompletionProvider;

    setup(() => {
        context = typemoq.Mock.ofType<IExtensionContext>();
        context.setup((c) => c.globalState).returns(() => undefined as any);
        context.setup((c) => c.workspaceState).returns(() => undefined as any);
        registerCommandStub = sinon.stub(vscodeapi, 'registerCommand');
        registerDebugAdapterTrackerFactoryStub = sinon.stub(vscode.debug, 'registerDebugAdapterTrackerFactory');
        registerDebugAdapterDescriptorFactoryStub = sinon.stub(vscode.debug, 'registerDebugAdapterDescriptorFactory');
        loggingFactory = new DebugSessionLoggingFactory();
        debuggerPromptFactory = new OutdatedDebuggerPromptFactory();
        debugSessionTelemetry = new DebugSessionTelemetry();
        completionProvider = new LaunchJsonCompletionProvider();
        persistantState = new PersistentStateFactory(context.object.globalState, context.object.workspaceState);
        registerCompletionItemProviderStub = sinon.stub(vscode.languages, 'registerCompletionItemProvider');
        descriptorFactory = new DebugAdapterDescriptorFactory(persistantState);
        context.setup((c) => c.subscriptions).returns(() => []);
    });
    teardown(() => {
        sinon.restore();
    });

    test('Ensure to register all the commands related to the debugger', () => {
        registerDebugger(context.object);

        sinon.assert.calledWithExactly(registerCommandStub, Commands.Debug_In_Terminal, sinon.match.any);
        sinon.assert.calledWithExactly(registerCommandStub, Commands.PickLocalProcess, sinon.match.any);
        sinon.assert.calledWithExactly(registerCommandStub, Commands.PickArguments, sinon.match.any);
        sinon.assert.calledWithExactly(
            registerCommandStub,
            Commands.SelectDebugConfig,
            sinon.match.any,
            sinon.match.any,
        );
        sinon.assert.calledWithExactly(registerCommandStub, Commands.ClearStorage, sinon.match.any);
        expect(registerCommandStub.callCount).to.be.equal(5);
    });

    test('Activation will register the Debug adapter factories', async () => {
        registerDebugger(context.object);

        sinon.assert.calledWithExactly(registerDebugAdapterTrackerFactoryStub, debuggerTypeName, loggingFactory);
        sinon.assert.calledWithExactly(registerDebugAdapterTrackerFactoryStub, debuggerTypeName, debuggerPromptFactory);
        sinon.assert.calledWithExactly(registerDebugAdapterTrackerFactoryStub, debuggerTypeName, debugSessionTelemetry);
        sinon.assert.calledOnceWithMatch(
            registerDebugAdapterDescriptorFactoryStub,
            debuggerTypeName,
            descriptorFactory,
        );

        expect(registerDebugAdapterTrackerFactoryStub.callCount).to.be.equal(3);
    });

    test('Activation will register the completion provider', async () => {
        registerDebugger(context.object);

        sinon.assert.calledWithExactly(registerCompletionItemProviderStub, { language: 'json' }, completionProvider);
        sinon.assert.calledWithExactly(registerCompletionItemProviderStub, { language: 'jsonc' }, completionProvider);
    });
});
