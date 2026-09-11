// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as sinon from 'sinon';
import { Uri, WorkspaceFolder, debug } from 'vscode';
import { ChildProcessAttachService } from '../../../extension/debugger/hooks/childProcessAttachService';
import { AttachRequestArguments, LaunchRequestArguments } from '../../../extension/types';
import * as vscodeapi from '../../../extension/common/vscodeapi';
import { debuggerTypeName } from '../../common';

suite('Debug - Attach to Child Process', () => {
    let attachService: ChildProcessAttachService;
    let getWorkspaceFoldersStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;
    let startDebuggingStub: sinon.SinonStub;

    setup(() => {
        attachService = new ChildProcessAttachService();
        getWorkspaceFoldersStub = sinon.stub(vscodeapi, 'getWorkspaceFolders');
        showErrorMessageStub = sinon.stub(vscodeapi, 'showErrorMessage');
        startDebuggingStub = sinon.stub(debug, 'startDebugging');
    });
    teardown(() => {
        sinon.restore();
    });

    test('Message is not displayed if debugger is launched', async () => {
        const data: AttachRequestArguments = {
            name: 'Attach',
            type: debuggerTypeName,
            request: 'attach',
            port: 1234,
            subProcessId: 2,
        };
        const session: any = {};
        getWorkspaceFoldersStub.returns(undefined);
        startDebuggingStub.resolves(true);
        showErrorMessageStub.returns(undefined);

        await attachService.attach(data, session);

        sinon.assert.calledOnce(getWorkspaceFoldersStub);
        sinon.assert.calledOnce(startDebuggingStub);
        sinon.assert.notCalled(showErrorMessageStub);
    });
    test('Message is displayed if debugger is not launched', async () => {
        const data: AttachRequestArguments = {
            name: 'Attach',
            type: debuggerTypeName,
            request: 'attach',
            port: 1234,
            subProcessId: 2,
        };

        const session: any = {};
        getWorkspaceFoldersStub.returns(undefined);
        startDebuggingStub.resolves(false);
        showErrorMessageStub.resolves(() => {});

        await attachService.attach(data, session);

        sinon.assert.calledOnce(getWorkspaceFoldersStub);
        sinon.assert.calledOnce(startDebuggingStub);
        sinon.assert.calledOnce(showErrorMessageStub);
    });
    test('Use correct workspace folder', async () => {
        const rightWorkspaceFolder: WorkspaceFolder = { name: '1', index: 1, uri: Uri.file('a') };
        const wkspace1: WorkspaceFolder = { name: '0', index: 0, uri: Uri.file('0') };
        const wkspace2: WorkspaceFolder = { name: '2', index: 2, uri: Uri.file('2') };

        const data: AttachRequestArguments = {
            name: 'Attach',
            type: debuggerTypeName,
            request: 'attach',
            port: 1234,
            subProcessId: 2,
            workspaceFolder: rightWorkspaceFolder.uri.fsPath,
        };

        const session: any = {};
        getWorkspaceFoldersStub.returns([wkspace1, rightWorkspaceFolder, wkspace2]);
        startDebuggingStub.withArgs(rightWorkspaceFolder).resolves(true);

        await attachService.attach(data, session);

        sinon.assert.called(getWorkspaceFoldersStub);
        sinon.assert.calledOnceWithExactly(startDebuggingStub, rightWorkspaceFolder, sinon.match.any, sinon.match.any);
        sinon.assert.notCalled(showErrorMessageStub);
    });
    test('Use empty workspace folder if right one is not found', async () => {
        const rightWorkspaceFolder: WorkspaceFolder = { name: '1', index: 1, uri: Uri.file('a') };
        const wkspace1: WorkspaceFolder = { name: '0', index: 0, uri: Uri.file('0') };
        const wkspace2: WorkspaceFolder = { name: '2', index: 2, uri: Uri.file('2') };

        const data: AttachRequestArguments = {
            name: 'Attach',
            type: debuggerTypeName,
            request: 'attach',
            port: 1234,
            subProcessId: 2,
            workspaceFolder: rightWorkspaceFolder.uri.fsPath,
        };

        const session: any = {};
        getWorkspaceFoldersStub.returns([wkspace1, wkspace2]);
        startDebuggingStub.withArgs(undefined).resolves(true);

        await attachService.attach(data, session);

        sinon.assert.called(getWorkspaceFoldersStub);
        sinon.assert.calledOnceWithExactly(startDebuggingStub, undefined, sinon.match.any, sinon.match.any);
        sinon.assert.notCalled(showErrorMessageStub);
    });
    test('Validate debug config is passed with the correct params', async () => {
        const data: LaunchRequestArguments | AttachRequestArguments = {
            request: 'attach',
            type: debuggerTypeName,
            name: 'Attach',
            port: 1234,
            subProcessId: 2,
            host: 'localhost',
        };

        const debugConfig = JSON.parse(JSON.stringify(data));
        debugConfig.host = 'localhost';
        const session: any = {};

        getWorkspaceFoldersStub.returns(undefined);
        startDebuggingStub.withArgs(undefined).resolves(true);

        await attachService.attach(data, session);

        sinon.assert.calledOnce(getWorkspaceFoldersStub);
        sinon.assert.calledOnceWithExactly(startDebuggingStub, undefined, sinon.match.any, sinon.match.any);
        const [, secondArg, thirdArg] = startDebuggingStub.args[0];
        expect(secondArg).to.deep.equal(debugConfig);
        expect(thirdArg).to.deep.equal({ parentSession: session, lifecycleManagedByParent: true });
        sinon.assert.notCalled(showErrorMessageStub);
    });
    test('Pass data as is if data is attach debug configuration', async () => {
        const data: AttachRequestArguments = {
            type: debuggerTypeName,
            request: 'attach',
            name: '',
        };
        const session: any = {};
        const debugConfig = JSON.parse(JSON.stringify(data));

        getWorkspaceFoldersStub.returns(undefined);
        startDebuggingStub.withArgs(undefined).resolves(true);

        await attachService.attach(data, session);

        sinon.assert.calledOnce(getWorkspaceFoldersStub);
        sinon.assert.calledOnceWithExactly(startDebuggingStub, undefined, sinon.match.any, sinon.match.any);
        const [, secondArg, thirdArg] = startDebuggingStub.args[0];
        expect(secondArg).to.deep.equal(debugConfig);
        expect(thirdArg).to.deep.equal({ parentSession: session, lifecycleManagedByParent: true });
        sinon.assert.notCalled(showErrorMessageStub);
    });
    test('Validate debug config when parent/root parent was attached', async () => {
        const data: AttachRequestArguments = {
            request: 'attach',
            type: debuggerTypeName,
            name: 'Attach',
            host: '123.123.123.123',
            port: 1234,
            subProcessId: 2,
        };

        const debugConfig = JSON.parse(JSON.stringify(data));
        debugConfig.host = data.host;
        debugConfig.port = data.port;
        debugConfig.request = 'attach';
        const session: any = {};

        getWorkspaceFoldersStub.returns(undefined);
        startDebuggingStub.withArgs(undefined).resolves(true);

        await attachService.attach(data, session);

        sinon.assert.calledOnce(getWorkspaceFoldersStub);
        sinon.assert.calledOnceWithExactly(startDebuggingStub, undefined, sinon.match.any, sinon.match.any);
        const [, secondArg, thirdArg] = startDebuggingStub.args[0];
        expect(secondArg).to.deep.equal(debugConfig);
        expect(thirdArg).to.deep.equal({ parentSession: session, lifecycleManagedByParent: true });
        sinon.assert.notCalled(showErrorMessageStub);
    });
    test('Child process debug config should not inherit purpose from parent session', async () => {
        // When the parent session is a test debug session (purpose: ['debug-test']),
        // the child process config inherits 'purpose' via debugpy's notify_of_subprocess.
        // We must strip 'purpose' from the child config so that VS Code's test adapter
        // does not treat child process session termination as test run completion,
        // which would cause premature disconnection of the parent debug session.
        // Regression test for: https://github.com/microsoft/vscode-python-debugger/issues/981
        const data: AttachRequestArguments = {
            request: 'attach',
            type: debuggerTypeName,
            name: 'Attach',
            port: 1234,
            subProcessId: 2,
            purpose: ['debug-test'],
        };

        const session: any = {};
        getWorkspaceFoldersStub.returns(undefined);
        startDebuggingStub.resolves(true);

        await attachService.attach(data, session);

        sinon.assert.calledOnce(startDebuggingStub);
        const [, secondArg] = startDebuggingStub.args[0];
        expect(secondArg).to.not.have.property('purpose');
        sinon.assert.notCalled(showErrorMessageStub);
    });
    test('Attaching to child process does not mutate the original data object', async () => {
        const data: AttachRequestArguments = {
            request: 'attach',
            type: debuggerTypeName,
            name: 'Attach',
            port: 1234,
            subProcessId: 2,
            purpose: ['debug-test'],
        };

        const session: any = {};
        getWorkspaceFoldersStub.returns(undefined);
        startDebuggingStub.resolves(true);

        await attachService.attach(data, session);

        // The original data object must not be mutated.
        expect(data).to.have.property('purpose').deep.equal(['debug-test']);
    });
    test('Child process attach keeps pytest launch fields while removing debug-test purpose', async () => {
        const pytestArgs = ['-s', '/workspace/tests/test_multiproc.py'];
        const data: AttachRequestArguments = {
            request: 'attach',
            type: debuggerTypeName,
            name: 'Attach',
            port: 1234,
            subProcessId: 2,
            purpose: ['debug-test'],
            module: 'pytest',
            args: pytestArgs,
            console: 'integratedTerminal',
        };
        const session: any = {};

        getWorkspaceFoldersStub.returns(undefined);
        startDebuggingStub.resolves(true);

        await attachService.attach(data, session);

        sinon.assert.calledOnce(startDebuggingStub);
        const [, secondArg] = startDebuggingStub.args[0];
        expect(secondArg).to.include({
            module: 'pytest',
            console: 'integratedTerminal',
        });
        expect(secondArg).to.have.property('args').deep.equal(pytestArgs);
        expect(secondArg).to.not.have.property('purpose');
    });
});
