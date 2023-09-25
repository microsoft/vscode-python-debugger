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
});
