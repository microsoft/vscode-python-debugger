/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs-extra';
import * as path from 'path';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { DebugSession, WorkspaceFolder } from 'vscode';
import { DebugProtocol } from '@vscode/debugprotocol';
import { EXTENSION_ROOT_DIR } from '../../../extension/common/constants';
import { DebugSessionLoggingFactory } from '../../../extension/debugger/adapter/logging';

suite('Debugging - Session Logging', () => {
    const oldValueOfVSC_PYTHON_UNIT_TEST = process.env.VSC_PYTHON_UNIT_TEST;
    const oldValueOfVSC_PYTHON_CI_TEST = process.env.VSC_PYTHON_CI_TEST;
    let loggerFactory: DebugSessionLoggingFactory;
    let createWriteStreamStub: sinon.SinonStub;
    let writeStream: fs.WriteStream;

    setup(() => {
        writeStream = mock(fs.WriteStream);
        createWriteStreamStub = sinon.stub(fs, 'createWriteStream');
        process.env.VSC_PYTHON_UNIT_TEST = undefined;
        process.env.VSC_PYTHON_CI_TEST = undefined;

        loggerFactory = new DebugSessionLoggingFactory();
    });

    teardown(() => {
        sinon.restore();
        process.env.VSC_PYTHON_UNIT_TEST = oldValueOfVSC_PYTHON_UNIT_TEST;
        process.env.VSC_PYTHON_CI_TEST = oldValueOfVSC_PYTHON_CI_TEST;
    });

    function createSession(id: string, workspaceFolder?: WorkspaceFolder): DebugSession {
        return {
            configuration: {
                name: '',
                request: 'launch',
                type: 'python',
            },
            id: id,
            name: 'python',
            type: 'python',
            workspaceFolder,
            customRequest: () => Promise.resolve(),
            getDebugProtocolBreakpoint: () => Promise.resolve(undefined),
        };
    }

    function createSessionWithLogging(id: string, logToFile: boolean, workspaceFolder?: WorkspaceFolder): DebugSession {
        const session = createSession(id, workspaceFolder);
        session.configuration.logToFile = logToFile;
        return session;
    }

    class TestMessage implements DebugProtocol.ProtocolMessage {
        public seq: number;
        public type: string;
        public id: number;
        public format: string;
        public variables?: { [key: string]: string };
        public sendTelemetry?: boolean;
        public showUser?: boolean;
        public url?: string;
        public urlLabel?: string;
        constructor(id: number, seq: number, type: string) {
            this.id = id;
            this.format = 'json';
            this.seq = seq;
            this.type = type;
        }
    }

    test('Create logger using session without logToFile', async () => {
        const session = createSession('test1');
        const filePath = path.join(EXTENSION_ROOT_DIR, `debugger.vscode_${session.id}.log`);

        await loggerFactory.createDebugAdapterTracker(session);
        sinon.assert.neverCalledWith(createWriteStreamStub, filePath);
    });

    test('Create logger using session with logToFile set to false', async () => {
        const session = createSessionWithLogging('test2', false);
        const filePath = path.join(EXTENSION_ROOT_DIR, `debugger.vscode_${session.id}.log`);

        createWriteStreamStub.withArgs(filePath).returns(instance(writeStream));
        when(writeStream.write(anything())).thenReturn(true);
        const logger = await loggerFactory.createDebugAdapterTracker(session);
        if (logger) {
            logger.onWillStartSession!();
        }

        sinon.assert.neverCalledWith(createWriteStreamStub, filePath);
        verify(writeStream.write(anything())).never();
    });

    test('Create logger using session with logToFile set to true', async () => {
        const session = createSessionWithLogging('test3', true);
        const filePath = path.join(EXTENSION_ROOT_DIR, `debugger.vscode_${session.id}.log`);
        const logs: string[] = [];

        createWriteStreamStub.withArgs(filePath).returns(instance(writeStream));

        when(writeStream.write(anything())).thenCall((msg) => logs.push(msg));

        const message = new TestMessage(1, 1, 'test-message');
        const logger = await loggerFactory.createDebugAdapterTracker(session);

        if (logger) {
            logger.onWillStartSession!();
            assert.ok(logs.pop()!.includes('Starting Session'));

            logger.onDidSendMessage!(message);
            const sentLog = logs.pop();
            assert.ok(sentLog!.includes('Client <-- Adapter'));
            assert.ok(sentLog!.includes('test-message'));

            logger.onWillReceiveMessage!(message);
            const receivedLog = logs.pop();
            assert.ok(receivedLog!.includes('Client --> Adapter'));
            assert.ok(receivedLog!.includes('test-message'));

            logger.onWillStopSession!();
            assert.ok(logs.pop()!.includes('Stopping Session'));

            logger.onError!(new Error('test error message'));
            assert.ok(logs.pop()!.includes('Error'));

            logger.onExit!(111, '222');
            const exitLog1 = logs.pop();
            assert.ok(exitLog1!.includes('Exit-Code: 111'));
            assert.ok(exitLog1!.includes('Signal: 222'));

            logger.onExit!(undefined, undefined);
            const exitLog2 = logs.pop();
            assert.ok(exitLog2!.includes('Exit-Code: 0'));
            assert.ok(exitLog2!.includes('Signal: none'));
        }

        sinon.assert.calledOnce(createWriteStreamStub);
        sinon.assert.calledWith(createWriteStreamStub, filePath);
        verify(writeStream.write(anything())).times(7);
    });
});
