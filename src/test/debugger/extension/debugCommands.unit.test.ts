// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';
import * as typemoq from 'typemoq';
import * as sinon from 'sinon';
import { Uri } from 'vscode';
import { EXTENSION_ROOT_DIR_FOR_TESTS } from '../../constants';
import { DebugCommands } from '../../../extension/debugger/debugCommands';
import { IExtensionSingleActivationService } from '../../../extension/activation/types';
import { Commands } from '../../../extension/common/constants';
import * as vscodeapi from '../../../extension/common/vscodeapi';
import { IDisposableRegistry } from '../../../extension/common/types';
import * as telemetry from '../../../extension/telemetry';

suite('Debugging - commands', () => {
    let disposables: typemoq.IMock<IDisposableRegistry>;
    let debugCommands: IExtensionSingleActivationService;
    let registerCommandStub: sinon.SinonStub;
    let startDebuggingStub: sinon.SinonStub;

    setup(() => {
        disposables = typemoq.Mock.ofType<IDisposableRegistry>();
        // interpreterService
        //     .setup((i) => i.getActiveInterpreter(typemoq.It.isAny()))
        //     .returns(() => Promise.resolve(({ path: 'ps' } as unknown) as PythonEnvironment));
        registerCommandStub = sinon.stub(vscodeapi,'registerCommand');
        startDebuggingStub = sinon.stub(vscodeapi,'startDebugging');
        sinon.stub(telemetry, 'sendTelemetryEvent').callsFake(() => {
            /** noop */
        });
    });
    teardown(() => {
        sinon.restore();
    });
    test('Test registering debug file command', async () => {
        registerCommandStub.withArgs(Commands.Debug_In_Terminal, sinon.match.any).returns(
            () => ({ dispose: () => {/* noop */},})
        );
        // commandManager
        //     .setup((c) => c.registerCommand(Commands.Debug_In_Terminal, typemoq.It.isAny()))
        //     .returns(() => ({
        //         dispose: () => {
        //             /* noop */
        //         },
        //     }))
        //     .verifiable(typemoq.Times.once());

        debugCommands = new DebugCommands(disposables.object);
        await debugCommands.activate();
        sinon.assert.calledOnce(registerCommandStub);
    });
    test('Test running debug file command', async () => {
        let callback: (f: Uri) => Promise<void> = (_f: Uri) => Promise.resolve();
        // commandManager
        //     .setup((c) => c.registerCommand(Commands.Debug_In_Terminal, typemoq.It.isAny()))
        //     .callback((_name, cb) => {
        //         callback = cb;
        //     });
        registerCommandStub.withArgs(Commands.Debug_In_Terminal, sinon.match.any).callsFake(
            (_name, cb)=>{callback = cb;}
        );
        // debugService
        //     .setup((d) => d.startDebugging(undefined, typemoq.It.isAny()))
        //     .returns(() => Promise.resolve(true))
        //     .verifiable(typemoq.Times.once());

        debugCommands = new DebugCommands(
            disposables.object,
        );
        await debugCommands.activate();

        await callback(Uri.file(path.join(EXTENSION_ROOT_DIR_FOR_TESTS, 'test.py')));
        sinon.assert.calledOnce(registerCommandStub);
        sinon.assert.calledOnce(startDebuggingStub);
    });
});
