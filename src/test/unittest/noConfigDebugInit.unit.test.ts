// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';
import { IExtensionContext } from '../../extension/common/types';
import { registerNoConfigDebug as registerNoConfigDebug } from '../../extension/noConfigDebugInit';
import * as TypeMoq from 'typemoq';
import * as sinon from 'sinon';
import { DebugConfiguration, DebugSessionOptions, RelativePattern, Uri, env, workspace } from 'vscode';
import * as utils from '../../extension/utils';
import { assert } from 'console';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';

suite('setup for no-config debug scenario', function () {
    let envVarCollectionReplaceStub: sinon.SinonStub;
    let envVarCollectionAppendStub: sinon.SinonStub;
    let context: TypeMoq.IMock<IExtensionContext>;
    let noConfigScriptsDir: string;
    let bundledDebugPath: string;
    let DEBUGPY_ADAPTER_ENDPOINTS = 'DEBUGPY_ADAPTER_ENDPOINTS';
    let BUNDLED_DEBUGPY_PATH = 'BUNDLED_DEBUGPY_PATH';
    let workspaceUriStub: sinon.SinonStub;
    let sessionIdStub: sinon.SinonStub;
    let stableWorkspaceHash: string;
    let workspacePath: string;

    const testDataDir = path.join(__dirname, 'testData');
    const testFilePath = path.join(testDataDir, 'debuggerAdapterEndpoint.txt');
    setup(() => {
        try {
            context = TypeMoq.Mock.ofType<IExtensionContext>();

            context.setup((c) => (c as any).extensionPath).returns(() => os.tmpdir());
            context.setup((c) => c.subscriptions).returns(() => []);
            noConfigScriptsDir = path.join(context.object.extensionPath, 'bundled/scripts/noConfigScripts');
            bundledDebugPath = path.join(context.object.extensionPath, 'bundled/libs/debugpy');

            sessionIdStub = sinon.stub(env, 'sessionId').value('test-session');
            workspacePath = os.tmpdir();

            // Stub crypto.randomBytes with proper typing
            let randomBytesStub = sinon.stub(crypto, 'randomBytes');
            // Provide a valid Buffer object
            randomBytesStub.callsFake((_size: number) => Buffer.from('1234567899', 'hex'));

            workspaceUriStub = sinon.stub(workspace, 'workspaceFolders').value([{ uri: Uri.parse(workspacePath) }]);

            const hash = crypto.createHash('sha256');
            hash.update(workspacePath.toString());
            hash.update('test-session');
            stableWorkspaceHash = hash.digest('hex').slice(0, 16);
        } catch (error) {
            console.error('Error in setup:', error);
        }
    });
    teardown(() => {
        sinon.restore();
        workspaceUriStub.restore();
        sessionIdStub.restore();
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
                    assert(
                        value ===
                            path.join(
                                context.object.extensionPath,
                                '.noConfigDebugAdapterEndpoints',
                                stableWorkspaceHash,
                            ),
                    );
                } else if (key === BUNDLED_DEBUGPY_PATH) {
                    assert(value === bundledDebugPath);
                } else if (key === 'PYDEVD_DISABLE_FILE_VALIDATION') {
                    assert(value === '1');
                }
            })
            .returns(envVarCollectionReplaceStub);
        environmentVariableCollectionMock
            .setup((x) => x.append(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
            .callback((key, value) => {
                if (key === 'PATH') {
                    assert(value.includes(noConfigScriptsDir));
                }
            })
            .returns(envVarCollectionAppendStub);

        context.setup((c) => c.environmentVariableCollection).returns(() => environmentVariableCollectionMock.object);

        setupFileSystemWatchers();

        // run init for no config debug
        await registerNoConfigDebug(context.object.environmentVariableCollection, context.object.extensionPath);

        // assert that functions called right number of times
        sinon.assert.calledThrice(envVarCollectionReplaceStub);
        sinon.assert.calledOnce(envVarCollectionAppendStub);
    });

    test('should not add extra separator when PATH already ends with separator', async () => {
        const environmentVariableCollectionMock = TypeMoq.Mock.ofType<any>();
        envVarCollectionReplaceStub = sinon.stub();
        envVarCollectionAppendStub = sinon.stub();

        // Simulate a PATH that already ends with a separator to test the fix
        const pathSeparator = process.platform === 'win32' ? ';' : ':';
        const originalPath = process.env.PATH;
        process.env.PATH = `/some/path${pathSeparator}`;

        try {
            environmentVariableCollectionMock
                .setup((x) => x.replace(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
                .returns(envVarCollectionReplaceStub);

            environmentVariableCollectionMock
                .setup((x) => x.append(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
                .callback((key, value) => {
                    if (key === 'PATH') {
                        // Since PATH already ends with separator, we should NOT add another one
                        assert(value === noConfigScriptsDir);
                        assert(!value.startsWith(pathSeparator));
                    }
                })
                .returns(envVarCollectionAppendStub);

            context
                .setup((c) => c.environmentVariableCollection)
                .returns(() => environmentVariableCollectionMock.object);

            setupFileSystemWatchers();

            // run init for no config debug
            await registerNoConfigDebug(context.object.environmentVariableCollection, context.object.extensionPath);

            // assert that append was called for PATH
            sinon.assert.calledOnce(envVarCollectionAppendStub);
        } finally {
            // Restore original PATH
            if (originalPath !== undefined) {
                process.env.PATH = originalPath;
            } else {
                delete process.env.PATH;
            }
        }
    });

    test('should add separator when PATH does not end with separator', async () => {
        const environmentVariableCollectionMock = TypeMoq.Mock.ofType<any>();
        envVarCollectionReplaceStub = sinon.stub();
        envVarCollectionAppendStub = sinon.stub();

        // Simulate a PATH that does NOT end with a separator
        const pathSeparator = process.platform === 'win32' ? ';' : ':';
        const originalPath = process.env.PATH;
        process.env.PATH = '/some/path';

        try {
            environmentVariableCollectionMock
                .setup((x) => x.replace(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
                .returns(envVarCollectionReplaceStub);

            environmentVariableCollectionMock
                .setup((x) => x.append(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
                .callback((key, value) => {
                    if (key === 'PATH') {
                        // Since PATH does NOT end with separator, we should add one
                        assert(value === `${pathSeparator}${noConfigScriptsDir}`);
                        assert(value.startsWith(pathSeparator));
                    }
                })
                .returns(envVarCollectionAppendStub);

            context
                .setup((c) => c.environmentVariableCollection)
                .returns(() => environmentVariableCollectionMock.object);

            setupFileSystemWatchers();

            // run init for no config debug
            await registerNoConfigDebug(context.object.environmentVariableCollection, context.object.extensionPath);

            // assert that append was called for PATH
            sinon.assert.calledOnce(envVarCollectionAppendStub);
        } finally {
            // Restore original PATH
            if (originalPath !== undefined) {
                process.env.PATH = originalPath;
            } else {
                delete process.env.PATH;
            }
        }
    });

    test('should create file system watcher for debuggerAdapterEndpointFolder', async () => {
        // Arrange
        const environmentVariableCollectionMock = TypeMoq.Mock.ofType<any>();
        context.setup((c) => c.environmentVariableCollection).returns(() => environmentVariableCollectionMock.object);
        let createFileSystemWatcherFunct = setupFileSystemWatchers();

        // Act
        await registerNoConfigDebug(context.object.environmentVariableCollection, context.object.extensionPath);

        // Assert
        sinon.assert.calledOnce(createFileSystemWatcherFunct);
        const expectedPattern = new RelativePattern(
            path.join(os.tmpdir(), '.noConfigDebugAdapterEndpoints', stableWorkspaceHash),
            '**/*.txt',
        );
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
        await registerNoConfigDebug(context.object.environmentVariableCollection, context.object.extensionPath);

        // Assert
        sinon.assert.calledOnce(debugStub);
        const expectedConfig: DebugConfiguration = {
            type: 'python',
            request: 'attach',
            name: 'Attach to Python',
            connect: {
                port: 5678,
                host: 'localhost',
            },
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

    test('should clear existing endpoint files when debuggerAdapterEndpointFolder exists', async () => {
        // Arrange
        const environmentVariableCollectionMock = TypeMoq.Mock.ofType<any>();
        context.setup((c) => c.environmentVariableCollection).returns(() => environmentVariableCollectionMock.object);

        const endpointFolderPath = path.join(os.tmpdir(), '.noConfigDebugAdapterEndpoints', stableWorkspaceHash);
        const fsExistsSyncStub = sinon.stub(fs, 'existsSync').callsFake((p) => p === endpointFolderPath);
        const fakeDirent = { isFile: () => true, name: Buffer.from('old.txt') } as unknown as fs.Dirent<Buffer>;
        const fsReaddirSyncStub = sinon.stub(fs, 'readdirSync').callsFake((dirPath: fs.PathLike, options?: any) => {
            assert(dirPath === endpointFolderPath);
            assert(options?.withFileTypes === true);
            return [fakeDirent] as unknown as fs.Dirent<Buffer>[];
        });
        const fsUnlinkSyncStub = sinon.stub(fs, 'unlinkSync');

        // Act
        await registerNoConfigDebug(context.object.environmentVariableCollection, context.object.extensionPath);

        // Assert
        sinon.assert.calledWith(fsExistsSyncStub, endpointFolderPath);
        sinon.assert.calledWith(fsUnlinkSyncStub, path.join(endpointFolderPath, 'old.txt'));

        // Cleanup
        fsExistsSyncStub.restore();
        fsReaddirSyncStub.restore();
        fsUnlinkSyncStub.restore();
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
