import * as path from 'path';
import { IExtensionContext } from '../../extension/common/types';
import { registerNoConfigDebug as registerNoConfigDebug } from '../../extension/noConfigDebugInit';
import * as TypeMoq from 'typemoq';
import * as sinon from 'sinon';
import { DebugConfiguration, DebugSessionOptions, RelativePattern, Uri } from 'vscode';
import * as utils from '../../extension/utils';
import { assert } from 'console';
import * as fs from 'fs';

suite('setup for no-config debug scenario', function () {
    let envVarCollectionReplaceStub: sinon.SinonStub;
    let envVarCollectionAppendStub: sinon.SinonStub;
    let context: TypeMoq.IMock<IExtensionContext>;
    let debugAdapterEndpointDir: string;
    let debuggerAdapterEndpointPath: string;
    let noConfigScriptsDir: string;
    let bundledDebugPath: string;
    let DEBUGPY_ADAPTER_ENDPOINTS = 'DEBUGPY_ADAPTER_ENDPOINTS';
    let BUNDLED_DEBUGPY_PATH = 'BUNDLED_DEBUGPY_PATH';

    const testDataDir = path.join(__dirname, 'testData');
    const testFilePath = path.join(testDataDir, 'debuggerAdapterEndpoint.txt');
    suiteSetup(() => {
        // create file called testData/debuggerAdapterEndpoint.txt
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir);
        }
        fs.writeFileSync(testFilePath, JSON.stringify({ client: { port: 5678 } }));
    });
    setup(() => {
        context = TypeMoq.Mock.ofType<IExtensionContext>();

        context.setup((c) => (c as any).extensionPath).returns(() => 'fake/extension/path');
        context.setup((c) => c.subscriptions).returns(() => []);
        debugAdapterEndpointDir = path.join(context.object.extensionPath, 'noConfigDebugAdapterEndpoints');
        debuggerAdapterEndpointPath = path.join(debugAdapterEndpointDir, 'debuggerAdapterEndpoint.txt');
        noConfigScriptsDir = path.join(context.object.extensionPath, 'bundled/scripts/noConfigScripts');
        bundledDebugPath = path.join(context.object.extensionPath, 'bundled/libs/debugpy');
    });
    teardown(() => {
        sinon.restore();
    });
    suiteTeardown(() => {
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    test('should add environment variables for DEBUGPY_ADAPTER_ENDPOINTS, BUNDLED_DEBUGPY_PATH, and PATH', async () => {
        const environmentVariableCollectionMock = TypeMoq.Mock.ofType<any>();
        envVarCollectionReplaceStub = sinon.stub();
        envVarCollectionAppendStub = sinon.stub();

        // set up the environment variable collection mock including asserts for the key, value pairs
        environmentVariableCollectionMock
            .setup((x) => x.replace(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
            .callback((key, value) => {
                if (key === DEBUGPY_ADAPTER_ENDPOINTS) {
                    assert(value === debuggerAdapterEndpointPath);
                } else if (key === BUNDLED_DEBUGPY_PATH) {
                    assert(value === bundledDebugPath);
                }
            })
            .returns(envVarCollectionReplaceStub);
        environmentVariableCollectionMock
            .setup((x) => x.append(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
            .callback((key, value) => {
                if (key === 'PATH') {
                    assert(value === `:${noConfigScriptsDir}`);
                }
            })
            .returns(envVarCollectionAppendStub);

        context.setup((c) => c.environmentVariableCollection).returns(() => environmentVariableCollectionMock.object);

        setupFileSystemWatchers();

        // run init for no config debug
        await registerNoConfigDebug(context.object);

        // assert that functions called right number of times
        sinon.assert.calledTwice(envVarCollectionReplaceStub);
        sinon.assert.calledOnce(envVarCollectionAppendStub);
    });

    test('should create file system watcher for debuggerAdapterEndpointFolder', async () => {
        // Arrange
        const environmentVariableCollectionMock = TypeMoq.Mock.ofType<any>();
        context.setup((c) => c.environmentVariableCollection).returns(() => environmentVariableCollectionMock.object);
        let createFileSystemWatcherFunct = setupFileSystemWatchers();

        // Act
        await registerNoConfigDebug(context.object);

        // Assert
        sinon.assert.calledOnce(createFileSystemWatcherFunct);
        const expectedPattern = new RelativePattern(debugAdapterEndpointDir, '**/*');
        sinon.assert.calledWith(createFileSystemWatcherFunct, expectedPattern);
    });

    test('should start debug session with client port', async () => {
        // Arrange
        const environmentVariableCollectionMock = TypeMoq.Mock.ofType<any>();
        context.setup((c) => c.environmentVariableCollection).returns(() => environmentVariableCollectionMock.object);

        // mock file sys watcher to give back test file
        let createFileSystemWatcherFunct: sinon.SinonStub;
        createFileSystemWatcherFunct = sinon.stub(utils, 'createFileSystemWatcher');
        createFileSystemWatcherFunct.callsFake(() => {
            return {
                onDidCreate: (callback: (arg0: Uri) => void) => {
                    callback(Uri.parse(testFilePath));
                },
            };
        });

        // create stub of fs.readFile function
        sinon.stub(fs, 'readFile').callsFake((_path: any, callback: (arg0: null, arg1: Buffer) => void) => {
            console.log('reading file');
            callback(null, Buffer.from(JSON.stringify({ client: { port: 5678 } })));
        });

        const debugStub = sinon.stub(utils, 'debugStartDebugging').resolves(true);

        // Act
        await registerNoConfigDebug(context.object);

        // Assert
        sinon.assert.calledOnce(debugStub);
        const expectedConfig: DebugConfiguration = {
            type: 'python',
            request: 'attach',
            name: 'Attach to Python',
            port: 5678,
            host: 'localhost',
        };
        const optionsExpected: DebugSessionOptions = {
            noDebug: false,
        };
        const actualConfig = debugStub.getCall(0).args[1];
        const actualOptions = debugStub.getCall(0).args[2];

        if (JSON.stringify(actualConfig) !== JSON.stringify(expectedConfig)) {
            console.log('Config diff:', {
                expected: expectedConfig,
                actual: actualConfig,
            });
        }

        if (JSON.stringify(actualOptions) !== JSON.stringify(optionsExpected)) {
            console.log('Options diff:', {
                expected: optionsExpected,
                actual: actualOptions,
            });
        }

        sinon.assert.calledWith(debugStub, undefined, expectedConfig, optionsExpected);
    });
});

function setupFileSystemWatchers(): sinon.SinonStub {
    // create stub of createFileSystemWatcher function that will return a fake watcher with a callback
    let createFileSystemWatcherFunct: sinon.SinonStub;
    createFileSystemWatcherFunct = sinon.stub(utils, 'createFileSystemWatcher');
    createFileSystemWatcherFunct.callsFake(() => {
        return {
            onDidCreate: (callback: (arg0: Uri) => void) => {
                callback(Uri.parse('fake/debuggerAdapterEndpoint.txt'));
            },
        };
    });
    // create stub of fs.readFile function
    sinon.stub(fs, 'readFile').callsFake(
        (TypeMoq.It.isAny(),
        TypeMoq.It.isAny(),
        (err, data) => {
            console.log(err, data);
        }),
    );
    return createFileSystemWatcherFunct;
}
