import * as path from 'path';
import { IExtensionContext } from '../../extension/common/types';
import { registerConfiglessDebug } from '../../extension/noConfigDebugInit';
import * as TypeMoq from 'typemoq';
import * as sinon from 'sinon';
import { Uri } from 'vscode';
import * as utils from '../../extension/utils';
import { assert } from 'console';
import * as fs from 'fs';

suite('registerConfiglessDebug', function () {
    this.timeout(100000); // Increase timeout to 10 seconds
    let replaceStub: sinon.SinonStub;
    let appendStub: sinon.SinonStub;
    let context: TypeMoq.IMock<IExtensionContext>;
    let createFileSystemWatcher: sinon.SinonStub;

    setup(() => {
        context = TypeMoq.Mock.ofType<IExtensionContext>();

        context.setup((c) => c.storageUri).returns(() => Uri.parse('a'));
        context.setup((c) => (c as any).extensionPath).returns(() => 'b');
        context.setup((c) => c.subscriptions).returns(() => []);

        createFileSystemWatcher = sinon.stub(utils, 'createFileSystemWatcher');
        createFileSystemWatcher.callsFake(() => {
            return {
                onDidCreate: (cb: (arg0: Uri) => void) => {
                    cb(Uri.parse('a'));
                },
            };
        });
        sinon.stub(fs, 'readFile').callsFake(
            (TypeMoq.It.isAny(),
            TypeMoq.It.isAny(),
            (err, data) => {
                console.log(err, data);
            }),
        );
    });
    teardown(() => {
        sinon.restore();
    });

    test('should add environment variables for DEBUGPY_ADAPTER_ENDPOINTS, BUNDLED_DEBUGPY_PATH, and PATH', async () => {
        const debugAdapterEndpointDir = path.join(context.object.extensionPath, 'noConfigDebugAdapterEndpoints');
        const debuggerAdapterEndpointPath = path.join(debugAdapterEndpointDir, 'debuggerAdapterEndpoint.txt');
        const noConfigScriptsDir = path.join(context.object.extensionPath, 'bundled/scripts/noConfigScripts');
        const bundledDebugPath = path.join(context.object.extensionPath, 'bundled/libs/debugpy');

        const environmentVariableCollectionMock = TypeMoq.Mock.ofType<any>();
        replaceStub = sinon.stub();
        appendStub = sinon.stub();
        environmentVariableCollectionMock
            .setup((x) => x.replace(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
            .callback((key, value) => {
                if (key === 'DEBUGPY_ADAPTER_ENDPOINTS') {
                    assert(value === debuggerAdapterEndpointPath);
                } else if (key === 'BUNDLED_DEBUGPY_PATH') {
                    assert(value === bundledDebugPath);
                }
            })
            .returns(replaceStub);
        environmentVariableCollectionMock
            .setup((x) => x.append(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
            .callback((key, value) => {
                if (key === 'PATH') {
                    assert(value === `:${noConfigScriptsDir}`);
                }
            })
            .returns(appendStub);

        context.setup((c) => c.environmentVariableCollection).returns(() => environmentVariableCollectionMock.object);

        await registerConfiglessDebug(context.object);
        console.log('All done!');
        sinon.assert.calledTwice(replaceStub);
    });
});
