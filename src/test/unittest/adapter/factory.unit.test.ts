/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as assert from 'assert';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import * as sinon from 'sinon';
import { SemVer } from 'semver';
import { instance, mock, when } from 'ts-mockito';
import { DebugAdapterExecutable, DebugAdapterServer, DebugConfiguration, DebugSession, WorkspaceFolder } from 'vscode';
import { IPersistentStateFactory } from '../../../extension/common/types';
import { DebugAdapterDescriptorFactory, debugStateKeys } from '../../../extension/debugger/adapter/factory';
import { IDebugAdapterDescriptorFactory } from '../../../extension/debugger/types';
import { EventName } from '../../../extension/telemetry/constants';
import { PersistentState, PersistentStateFactory } from '../../../extension/common/persistentState';
import { EXTENSION_ROOT_DIR } from '../../../extension/common/constants';
import { Architecture } from '../../../extension/common/platform';
import * as pythonApi from '../../../extension/common/python';
import * as telemetry from '../../../extension/telemetry';
import * as telemetryReporter from '../../../extension/telemetry/reporter';
import * as vscodeApi from '../../../extension/common/vscodeapi';
import { DebugConfigStrings } from '../../../extension/common/utils/localize';

use(chaiAsPromised);

suite('Debugging - Adapter Factory', () => {
    let factory: IDebugAdapterDescriptorFactory;
    let stateFactory: IPersistentStateFactory;
    let state: PersistentState<boolean | undefined>;
    let showErrorMessageStub: sinon.SinonStub;
    let resolveEnvironmentStub: sinon.SinonStub;
    let getInterpretersStub: sinon.SinonStub;
    let getInterpreterDetailsStub: sinon.SinonStub;
    let hasInterpretersStub: sinon.SinonStub;
    let getTelemetryReporterStub: sinon.SinonStub;
    let reporter: any;

    const nodeExecutable = undefined;
    const debugAdapterPath = path.join(EXTENSION_ROOT_DIR, 'bundled', 'libs', 'debugpy', 'adapter');
    const pythonPath = path.join('path', 'to', 'python', 'interpreter');
    const interpreter = {
        architecture: Architecture.Unknown,
        path: pythonPath,
        sysPrefix: '',
        sysVersion: '',
        envType: 'Unknow',
        version: new SemVer('3.7.4-test'),
    };
    const oldValueOfVSC_PYTHON_UNIT_TEST = process.env.VSC_PYTHON_UNIT_TEST;
    const oldValueOfVSC_PYTHON_CI_TEST = process.env.VSC_PYTHON_CI_TEST;

    class Reporter {
        public static eventNames: string[] = [];
        public static properties: Record<string, string>[] = [];
        public static measures: {}[] = [];
        public sendTelemetryEvent(eventName: string, properties?: {}, measures?: {}) {
            Reporter.eventNames.push(eventName);
            Reporter.properties.push(properties!);
            Reporter.measures.push(measures!);
        }
    }

    setup(() => {
        process.env.VSC_PYTHON_UNIT_TEST = undefined;
        process.env.VSC_PYTHON_CI_TEST = undefined;
        reporter = new Reporter();

        stateFactory = mock(PersistentStateFactory);
        state = mock(PersistentState) as PersistentState<boolean | undefined>;
        showErrorMessageStub = sinon.stub(vscodeApi, 'showErrorMessage');
        resolveEnvironmentStub = sinon.stub(pythonApi, 'resolveEnvironment');
        getInterpretersStub = sinon.stub(pythonApi, 'getInterpreters');
        getInterpreterDetailsStub = sinon.stub(pythonApi, 'getInterpreterDetails');
        hasInterpretersStub = sinon.stub(pythonApi, 'hasInterpreters');
        getTelemetryReporterStub = sinon.stub(telemetryReporter, 'getTelemetryReporter');

        when(
            stateFactory.createGlobalPersistentState<boolean | undefined>(debugStateKeys.doNotShowAgain, false),
        ).thenReturn(instance(state));
        getInterpretersStub.returns([interpreter]);
        hasInterpretersStub.returns(true);
        getTelemetryReporterStub.returns(reporter);
        factory = new DebugAdapterDescriptorFactory(instance(stateFactory));
    });

    teardown(() => {
        process.env.VSC_PYTHON_UNIT_TEST = oldValueOfVSC_PYTHON_UNIT_TEST;
        process.env.VSC_PYTHON_CI_TEST = oldValueOfVSC_PYTHON_CI_TEST;
        Reporter.properties = [];
        Reporter.eventNames = [];
        Reporter.measures = [];
        telemetry.clearTelemetryReporter();
        sinon.restore();
    });

    function createSession(config: Partial<DebugConfiguration>, workspaceFolder?: WorkspaceFolder): DebugSession {
        return {
            configuration: { name: '', request: 'launch', type: 'python', ...config },
            id: '',
            name: 'python',
            type: 'python',
            workspaceFolder,
            customRequest: () => Promise.resolve(),
            getDebugProtocolBreakpoint: () => Promise.resolve(undefined),
        };
    }

    test('Return the value of configuration.pythonPath as the current python path if it exists', async () => {
        const session = createSession({ pythonPath });
        const debugExecutable = new DebugAdapterExecutable(pythonPath, [debugAdapterPath]);

        resolveEnvironmentStub.withArgs(pythonPath).resolves(interpreter);
        const descriptor = await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        assert.deepStrictEqual(descriptor, debugExecutable);
    });

    test('Return the path of the active interpreter as the current python path, it exists and configuration.pythonPath is not defined', async () => {
        const session = createSession({});
        const debugExecutable = new DebugAdapterExecutable(pythonPath, [debugAdapterPath]);
        getInterpreterDetailsStub.resolves({ path: [interpreter.path] });
        resolveEnvironmentStub.resolves(interpreter);
        const descriptor = await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        assert.deepStrictEqual(descriptor, debugExecutable);
    });

    test('Display a message if no python interpreter is set', async () => {
        getInterpreterDetailsStub.resolves(undefined);
        const session = createSession({});
        const promise = factory.createDebugAdapterDescriptor(session, nodeExecutable);

        await expect(promise).to.eventually.be.rejectedWith(DebugConfigStrings.debugStopped);

        //check error message
        sinon.assert.calledOnce(showErrorMessageStub);
    });

    test('Display a message if python version is less than 3.7', async () => {
        getInterpretersStub.returns([]);
        const session = createSession({});
        const deprecatedInterpreter = {
            architecture: Architecture.Unknown,
            path: pythonPath,
            sysPrefix: '',
            sysVersion: '',
            envType: 'Unknown',
            version: new SemVer('3.6.12-test'),
        };
        when(state.value).thenReturn(false);
        getInterpreterDetailsStub.resolves({ path: [deprecatedInterpreter.path] });
        resolveEnvironmentStub.resolves(deprecatedInterpreter);

        await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        sinon.assert.calledOnce(showErrorMessageStub);
    });

    test('Return Debug Adapter server if request is "attach", and port is specified directly', async () => {
        const session = createSession({ request: 'attach', port: 5678, host: 'localhost' });
        const debugServer = new DebugAdapterServer(session.configuration.port, session.configuration.host);
        const descriptor = await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        // Interpreter not needed for host/port
        sinon.assert.neverCalledWith(getInterpretersStub);

        assert.deepStrictEqual(descriptor, debugServer);
    });

    test('Return Debug Adapter server if request is "attach", and connect is specified', async () => {
        const session = createSession({ request: 'attach', connect: { port: 5678, host: 'localhost' } });
        const debugServer = new DebugAdapterServer(
            session.configuration.connect.port,
            session.configuration.connect.host,
        );

        const descriptor = await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        // Interpreter not needed for connect
        sinon.assert.neverCalledWith(getInterpretersStub);
        assert.deepStrictEqual(descriptor, debugServer);
    });

    test('Return Debug Adapter server if request is "attach", and connect is specified with port as string', async () => {
        const session = createSession({ request: 'attach', connect: { port: '5678', host: 'localhost' } });
        const debugServer = new DebugAdapterServer(5678, session.configuration.connect.host);
        const descriptor = await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        // Interpreter not needed for connect
        sinon.assert.neverCalledWith(getInterpretersStub);
        assert.deepStrictEqual(descriptor, debugServer);
    });

    test('Return Debug Adapter executable if request is "attach", and listen is specified', async () => {
        const session = createSession({ request: 'attach', listen: { port: 5678, host: 'localhost' } });
        const debugExecutable = new DebugAdapterExecutable(pythonPath, [debugAdapterPath]);
        getInterpreterDetailsStub.resolves({ path: [interpreter.path] });
        resolveEnvironmentStub.resolves(interpreter);
        const descriptor = await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        assert.deepStrictEqual(descriptor, debugExecutable);
    });

    test('Throw error if request is "attach", and neither port, processId, listen, nor connect is specified', async () => {
        const session = createSession({
            request: 'attach',
            port: undefined,
            processId: undefined,
            listen: undefined,
            connect: undefined,
        });

        const promise = factory.createDebugAdapterDescriptor(session, nodeExecutable);

        await expect(promise).to.eventually.be.rejectedWith(
            '"request":"attach" requires either "connect", "listen", or "processId"',
        );
    });

    test('Pass the --log-dir argument to debug adapter if configuration.logToFile is set', async () => {
        const session = createSession({ logToFile: true });
        const debugExecutable = new DebugAdapterExecutable(pythonPath, [
            debugAdapterPath,
            '--log-dir',
            EXTENSION_ROOT_DIR,
        ]);

        getInterpreterDetailsStub.resolves({ path: [interpreter.path] });
        resolveEnvironmentStub.withArgs(interpreter.path).resolves(interpreter);

        const descriptor = await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        assert.deepStrictEqual(descriptor, debugExecutable);
    });

    test("Don't pass the --log-dir argument to debug adapter if configuration.logToFile is not set", async () => {
        const session = createSession({});
        const debugExecutable = new DebugAdapterExecutable(pythonPath, [debugAdapterPath]);

        getInterpreterDetailsStub.resolves({ path: [interpreter.path] });
        resolveEnvironmentStub.withArgs(interpreter.path).resolves(interpreter);

        const descriptor = await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        assert.deepStrictEqual(descriptor, debugExecutable);
    });

    test("Don't pass the --log-dir argument to debugger if configuration.logToFile is set to false", async () => {
        const session = createSession({ logToFile: false });
        const debugExecutable = new DebugAdapterExecutable(pythonPath, [debugAdapterPath]);

        getInterpreterDetailsStub.resolves({ path: [interpreter.path] });
        resolveEnvironmentStub.withArgs(interpreter.path).resolves(interpreter);

        const descriptor = await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        assert.deepStrictEqual(descriptor, debugExecutable);
    });

    test('Send attach to local process telemetry if attaching to a local process', async () => {
        const session = createSession({ request: 'attach', processId: 1234 });
        getInterpreterDetailsStub.resolves({ path: [interpreter.path] });
        resolveEnvironmentStub.withArgs(interpreter.path).resolves(interpreter);

        await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        assert.ok(Reporter.eventNames.includes(EventName.DEBUGGER_ATTACH_TO_LOCAL_PROCESS));
    });

    test("Don't send any telemetry if not attaching to a local process", async () => {
        const session = createSession({});
        getInterpreterDetailsStub.resolves({ path: [interpreter.path] });
        resolveEnvironmentStub.withArgs(interpreter.path).resolves(interpreter);

        await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        assert.ok(Reporter.eventNames.includes(EventName.DEBUG_ADAPTER_USING_WHEELS_PATH));
    });

    test('Use "debugAdapterPath" when specified', async () => {
        const customAdapterPath = 'custom/debug/adapter/path';
        const session = createSession({ debugAdapterPath: customAdapterPath });
        const debugExecutable = new DebugAdapterExecutable(pythonPath, [customAdapterPath]);
        getInterpreterDetailsStub.resolves({ path: [interpreter.path] });
        resolveEnvironmentStub.withArgs(interpreter.path).resolves(interpreter);
        const descriptor = await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        assert.deepStrictEqual(descriptor, debugExecutable);
    });

    test('Use "debugAdapterPython" when specified', async () => {
        const session = createSession({ debugAdapterPython: '/bin/custompy' });
        const debugExecutable = new DebugAdapterExecutable('/bin/custompy', [debugAdapterPath]);
        const customInterpreter = {
            architecture: Architecture.Unknown,
            path: '/bin/custompy',
            sysPrefix: '',
            sysVersion: '',
            envType: 'unknow',
            version: new SemVer('3.7.4-test'),
        };

        resolveEnvironmentStub.withArgs('/bin/custompy').resolves(customInterpreter);
        const descriptor = await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        assert.deepStrictEqual(descriptor, debugExecutable);
    });

    test('Do not use "python" to spawn the debug adapter', async () => {
        const session = createSession({ python: '/bin/custompy' });
        const debugExecutable = new DebugAdapterExecutable(pythonPath, [debugAdapterPath]);
        getInterpreterDetailsStub.resolves({ path: [interpreter.path] });
        resolveEnvironmentStub.withArgs(interpreter.path).resolves(interpreter);
        const descriptor = await factory.createDebugAdapterDescriptor(session, nodeExecutable);

        assert.deepStrictEqual(descriptor, debugExecutable);
    });
});
