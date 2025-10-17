// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as sinon from 'sinon';
import { Uri, Disposable, Extension, commands, extensions } from 'vscode';
import * as pythonApi from '../../../extension/common/python';
import {
    PythonExtension,
    Environment,
    EnvironmentPath,
    ResolvedEnvironment,
    ActiveEnvironmentPathChangeEvent,
} from '@vscode/python-extension';

suite('Python API Tests', () => {
    let getExtensionStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let mockPythonExtension: Extension<any>;
    let mockEnvsExtension: Extension<any>;
    let mockPythonExtensionApi: any;
    let mockPythonEnvApi: any;

    setup(() => {
        // Stub extensions.getExtension
        getExtensionStub = sinon.stub(extensions, 'getExtension');
        executeCommandStub = sinon.stub(commands, 'executeCommand');

        // Create mock Python extension
        mockPythonExtension = {
            id: 'ms-python.python',
            extensionUri: Uri.file('/mock/path'),
            extensionPath: '/mock/path',
            isActive: true,
            packageJSON: {},
            exports: undefined,
            activate: sinon.stub().resolves(),
            extensionKind: 1,
        } as any;

        // Create mock Python Envs extension
        mockEnvsExtension = {
            id: 'ms-python.vscode-python-envs',
            extensionUri: Uri.file('/mock/path'),
            extensionPath: '/mock/path',
            isActive: true,
            packageJSON: {},
            exports: undefined,
            activate: sinon.stub().resolves(),
            extensionKind: 1,
        } as any;

        // Create mock Python extension API
        mockPythonExtensionApi = {
            ready: Promise.resolve(),
            settings: {
                getExecutionDetails: sinon.stub().returns({ execCommand: undefined }),
            },
        };

        // Create mock Python environment API
        mockPythonEnvApi = {
            environments: {
                known: [],
                getActiveEnvironmentPath: sinon.stub(),
                resolveEnvironment: sinon.stub(),
                getEnvironmentVariables: sinon.stub(),
                onDidChangeActiveEnvironmentPath: sinon.stub().returns({ dispose: sinon.stub() }),
                onDidChangeEnvironments: sinon.stub().returns({ dispose: sinon.stub() }),
                refreshEnvironments: sinon.stub().resolves(),
            },
        };

        // Setup default behavior
        getExtensionStub.withArgs('ms-python.python').returns(mockPythonExtension);
        getExtensionStub.withArgs('ms-python.vscode-python-envs').returns(mockEnvsExtension);
    });

    teardown(() => {
        sinon.restore();
    });

    suite('initializePython', () => {
        test('Should initialize python and set up event listeners', async () => {
            const disposables: Disposable[] = [];

            (mockPythonExtension as any).exports = mockPythonExtensionApi;
            mockPythonEnvApi.environments.onDidChangeActiveEnvironmentPath.returns({
                dispose: sinon.stub(),
            });
            mockPythonEnvApi.environments.resolveEnvironment.resolves({
                executable: { uri: Uri.file('/usr/bin/python3') },
            } as ResolvedEnvironment);

            // Stub PythonExtension.api()
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            await pythonApi.initializePython(disposables);

            expect(disposables.length).to.be.greaterThan(0);
            expect(mockPythonEnvApi.environments.onDidChangeActiveEnvironmentPath.called).to.be.true;
        });

        test('Should handle errors gracefully when python extension is not available', async () => {
            const disposables: Disposable[] = [];
            sinon.stub(PythonExtension, 'api').rejects(new Error('Extension not found'));

            await pythonApi.initializePython(disposables);

            // Should not throw, just handle error internally
            expect(disposables.length).to.equal(0);
        });

        test('Should fire onDidChangePythonInterpreter event after initialization', async () => {
            const disposables: Disposable[] = [];
            const mockEventHandler = sinon.stub();

            (mockPythonExtension as any).exports = mockPythonExtensionApi;
            mockPythonEnvApi.environments.resolveEnvironment.resolves({
                executable: { uri: Uri.file('/usr/bin/python3') },
            } as ResolvedEnvironment);

            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Event should be fired during initialization
            sinon.assert.called(mockEventHandler);
        });
    });

    suite('runPythonExtensionCommand', () => {
        test('Should execute command through VS Code commands API', async () => {
            (mockPythonExtension as any).isActive = true;
            executeCommandStub.resolves('result');

            const result = await pythonApi.runPythonExtensionCommand('python.test.command', 'arg1', 'arg2');

            expect(result).to.equal('result');
            sinon.assert.calledWith(executeCommandStub, 'python.test.command', 'arg1', 'arg2');
        });

        test('Should activate extension before executing command if not active', async () => {
            (mockPythonExtension as any).isActive = false;
            const activateStub = mockPythonExtension.activate as sinon.SinonStub;
            executeCommandStub.resolves('result');

            await pythonApi.runPythonExtensionCommand('python.test.command');

            sinon.assert.called(activateStub);
            sinon.assert.called(executeCommandStub);
        });
    });

    suite('getSettingsPythonPath', () => {
        test('Should return execution details from Python extension API', async () => {
            const expectedPath = ['/usr/bin/python3'];
            mockPythonExtensionApi.settings.getExecutionDetails.returns({ execCommand: expectedPath });
            (mockPythonExtension as any).exports = mockPythonExtensionApi;
            (mockPythonExtension as any).isActive = true;

            const result = await pythonApi.getSettingsPythonPath();

            expect(result).to.deep.equal(expectedPath);
        });

        test('Should return execution details for specific resource', async () => {
            const resource = Uri.file('/workspace/file.py');
            const expectedPath = ['/usr/bin/python3'];
            mockPythonExtensionApi.settings.getExecutionDetails.returns({ execCommand: expectedPath });
            (mockPythonExtension as any).exports = mockPythonExtensionApi;
            (mockPythonExtension as any).isActive = true;

            const result = await pythonApi.getSettingsPythonPath(resource);

            expect(result).to.deep.equal(expectedPath);
            sinon.assert.calledWith(mockPythonExtensionApi.settings.getExecutionDetails, resource);
        });

        test('Should return undefined when execCommand is not available', async () => {
            mockPythonExtensionApi.settings.getExecutionDetails.returns({ execCommand: undefined });
            (mockPythonExtension as any).exports = mockPythonExtensionApi;
            (mockPythonExtension as any).isActive = true;

            const result = await pythonApi.getSettingsPythonPath();

            expect(result).to.be.undefined;
        });
    });

    suite('getEnvironmentVariables', () => {
        test('Should return environment variables from Python extension API', async () => {
            const expectedVars = { PATH: '/usr/bin', PYTHONPATH: '/usr/lib/python3' };
            mockPythonEnvApi.environments.getEnvironmentVariables.returns(Promise.resolve(expectedVars));

            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.getEnvironmentVariables();

            expect(result).to.deep.equal(expectedVars);
            sinon.assert.calledWith(mockPythonEnvApi.environments.getEnvironmentVariables, sinon.match.any);
        });

        test('Should get environment variables for specific resource', async () => {
            const resource = Uri.file('/workspace/file.py');
            const expectedVars = { PATH: '/usr/bin' };
            mockPythonEnvApi.environments.getEnvironmentVariables.returns(Promise.resolve(expectedVars));

            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.getEnvironmentVariables(resource);

            expect(result).to.deep.equal(expectedVars);
            sinon.assert.calledWith(mockPythonEnvApi.environments.getEnvironmentVariables, resource);
        });
    });

    suite('resolveEnvironment', () => {
        test('Should resolve environment from path string', async () => {
            const envPath = '/usr/bin/python3';
            const expectedEnv: ResolvedEnvironment = {
                id: 'test-env',
                executable: { uri: Uri.file(envPath) },
            } as ResolvedEnvironment;

            mockPythonEnvApi.environments.resolveEnvironment.resolves(expectedEnv);
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.resolveEnvironment(envPath);

            expect(result).to.deep.equal(expectedEnv);
            sinon.assert.calledWith(mockPythonEnvApi.environments.resolveEnvironment, envPath);
        });

        test('Should resolve environment from Environment object', async () => {
            const env: Environment = {
                id: 'test-env',
                path: '/usr/bin/python3',
            } as Environment;
            const expectedEnv: ResolvedEnvironment = {
                id: 'test-env',
                executable: { uri: Uri.file('/usr/bin/python3') },
            } as ResolvedEnvironment;

            mockPythonEnvApi.environments.resolveEnvironment.resolves(expectedEnv);
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.resolveEnvironment(env);

            expect(result).to.deep.equal(expectedEnv);
        });

        test('Should return undefined for invalid environment', async () => {
            const envPath = '/invalid/path';
            mockPythonEnvApi.environments.resolveEnvironment.resolves(undefined);
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.resolveEnvironment(envPath);

            expect(result).to.be.undefined;
        });
    });

    suite('getActiveEnvironmentPath', () => {
        test('Should return active environment path', async () => {
            const expectedPath: EnvironmentPath = {
                id: 'test-env',
                path: '/usr/bin/python3',
            };
            mockPythonEnvApi.environments.getActiveEnvironmentPath.returns(expectedPath);
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.getActiveEnvironmentPath();

            expect(result).to.deep.equal(expectedPath);
        });

        test('Should return active environment path for specific resource', async () => {
            const resource = Uri.file('/workspace/file.py');
            const expectedPath: EnvironmentPath = {
                id: 'test-env',
                path: '/usr/bin/python3',
            };
            mockPythonEnvApi.environments.getActiveEnvironmentPath.returns(expectedPath);
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.getActiveEnvironmentPath(resource);

            expect(result).to.deep.equal(expectedPath);
            sinon.assert.calledWith(mockPythonEnvApi.environments.getActiveEnvironmentPath, resource);
        });
    });

    suite('getInterpreterDetails', () => {
        test('Should return interpreter details with path', async () => {
            const pythonPath = '/usr/bin/python3';
            const mockEnv: ResolvedEnvironment = {
                id: 'test-env',
                executable: { uri: Uri.file(pythonPath) },
            } as ResolvedEnvironment;

            mockPythonEnvApi.environments.getActiveEnvironmentPath.returns({ path: pythonPath });
            mockPythonEnvApi.environments.resolveEnvironment.resolves(mockEnv);
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.getInterpreterDetails();

            expect(result.path).to.deep.equal([pythonPath]);
            expect(result.resource).to.be.undefined;
        });

        test('Should return interpreter details with resource', async () => {
            const resource = Uri.file('/workspace/file.py');
            const pythonPath = '/usr/bin/python3';
            const mockEnv: ResolvedEnvironment = {
                id: 'test-env',
                executable: { uri: Uri.file(pythonPath) },
            } as ResolvedEnvironment;

            mockPythonEnvApi.environments.getActiveEnvironmentPath.returns({ path: pythonPath });
            mockPythonEnvApi.environments.resolveEnvironment.resolves(mockEnv);
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.getInterpreterDetails(resource);

            expect(result.path).to.deep.equal([pythonPath]);
            expect(result.resource).to.deep.equal(resource);
        });

        test('Should quote path with spaces', async () => {
            const pythonPath = '/path with spaces/python3';
            const mockEnv: ResolvedEnvironment = {
                id: 'test-env',
                executable: { uri: Uri.file(pythonPath) },
            } as ResolvedEnvironment;

            mockPythonEnvApi.environments.getActiveEnvironmentPath.returns({ path: pythonPath });
            mockPythonEnvApi.environments.resolveEnvironment.resolves(mockEnv);
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.getInterpreterDetails();

            expect(result.path).to.deep.equal([`"${pythonPath}"`]);
        });

        test('Should not double-quote already quoted path', async () => {
            const quotedPythonPath = '"/path with spaces/python3"';
            // Create a mock Uri that when accessed via fsPath returns the already quoted path
            const mockUri = {
                fsPath: quotedPythonPath,
            } as Uri;
            const mockEnv: ResolvedEnvironment = {
                id: 'test-env',
                executable: { uri: mockUri },
            } as ResolvedEnvironment;

            mockPythonEnvApi.environments.getActiveEnvironmentPath.returns({ path: quotedPythonPath });
            mockPythonEnvApi.environments.resolveEnvironment.resolves(mockEnv);
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.getInterpreterDetails();

            expect(result.path).to.deep.equal([quotedPythonPath]);
        });

        test('Should return undefined path when environment is not resolved', async () => {
            mockPythonEnvApi.environments.getActiveEnvironmentPath.returns({ path: '/usr/bin/python3' });
            mockPythonEnvApi.environments.resolveEnvironment.resolves(undefined);
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.getInterpreterDetails();

            expect(result.path).to.be.undefined;
            expect(result.resource).to.be.undefined;
        });

        test('Should return undefined path when executable uri is not available', async () => {
            const mockEnv: ResolvedEnvironment = {
                id: 'test-env',
                executable: { uri: undefined },
            } as any;

            mockPythonEnvApi.environments.getActiveEnvironmentPath.returns({ path: '/usr/bin/python3' });
            mockPythonEnvApi.environments.resolveEnvironment.resolves(mockEnv);
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.getInterpreterDetails();

            expect(result.path).to.be.undefined;
        });
    });

    suite('hasInterpreters', () => {
        test('Should return true when interpreters are available initially', async () => {
            mockPythonEnvApi.environments.known = [{ id: 'env1', path: '/usr/bin/python3' } as Environment];
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.hasInterpreters();

            expect(result).to.be.true;
        });

        test('Should return false when no interpreters are available', async () => {
            mockPythonEnvApi.environments.known = [];
            mockPythonEnvApi.environments.refreshEnvironments.resolves();
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.hasInterpreters();

            expect(result).to.be.false;
        });

        test('Should wait for environments to be added after refresh', async () => {
            mockPythonEnvApi.environments.known = [];
            let onDidChangeCallback: any;
            mockPythonEnvApi.environments.onDidChangeEnvironments = (callback: any) => {
                onDidChangeCallback = callback;
                return { dispose: sinon.stub() };
            };
            mockPythonEnvApi.environments.refreshEnvironments = async () => {
                // Simulate environments being added
                mockPythonEnvApi.environments.known = [{ id: 'env1', path: '/usr/bin/python3' } as Environment];
                if (onDidChangeCallback) {
                    onDidChangeCallback();
                }
            };

            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.hasInterpreters();

            expect(result).to.be.true;
        });
    });

    suite('getInterpreters', () => {
        test('Should return list of known interpreters', async () => {
            const expectedEnvs: readonly Environment[] = [
                { id: 'env1', path: '/usr/bin/python3' } as Environment,
                { id: 'env2', path: '/usr/bin/python2' } as Environment,
            ];
            mockPythonEnvApi.environments.known = expectedEnvs;
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.getInterpreters();

            expect(result).to.deep.equal(expectedEnvs);
        });

        test('Should return empty array when no interpreters are available', async () => {
            mockPythonEnvApi.environments.known = [];
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.getInterpreters();

            expect(result).to.deep.equal([]);
        });

        test('Should return empty array when known is null', async () => {
            mockPythonEnvApi.environments.known = null;
            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            const result = await pythonApi.getInterpreters();

            expect(result).to.deep.equal([]);
        });
    });

    suite('onDidChangePythonInterpreter event', () => {
        test('Should fire event when active environment path changes', async () => {
            const disposables: Disposable[] = [];
            let eventCallback: any;
            const mockEventHandler = sinon.stub();

            mockPythonEnvApi.environments.onDidChangeActiveEnvironmentPath = (callback: any) => {
                eventCallback = callback;
                return { dispose: sinon.stub() };
            };
            mockPythonEnvApi.environments.resolveEnvironment.resolves({
                executable: { uri: Uri.file('/usr/bin/python3') },
            } as ResolvedEnvironment);

            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Simulate environment path change
            const changeEvent: ActiveEnvironmentPathChangeEvent = {
                id: 'test-env',
                path: '/usr/bin/python3.9',
                resource: Uri.file('/workspace'),
            };
            eventCallback(changeEvent);

            // Should be called at least twice: once during init, once from the event
            expect(mockEventHandler.callCount).to.be.greaterThan(1);
            const lastCall = mockEventHandler.lastCall.args[0];
            expect(lastCall.path).to.deep.equal(['/usr/bin/python3.9']);
            expect(lastCall.resource).to.deep.equal(Uri.file('/workspace'));
        });

        test('Should handle WorkspaceFolder resource in event', async () => {
            const disposables: Disposable[] = [];
            let eventCallback: any;
            const mockEventHandler = sinon.stub();

            mockPythonEnvApi.environments.onDidChangeActiveEnvironmentPath = (callback: any) => {
                eventCallback = callback;
                return { dispose: sinon.stub() };
            };
            mockPythonEnvApi.environments.resolveEnvironment.resolves({
                executable: { uri: Uri.file('/usr/bin/python3') },
            } as ResolvedEnvironment);

            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Simulate environment path change with WorkspaceFolder resource
            const workspaceFolderUri = Uri.file('/workspace');
            const changeEvent: any = {
                id: 'test-env',
                path: '/usr/bin/python3.9',
                resource: { uri: workspaceFolderUri, name: 'workspace', index: 0 },
            };
            eventCallback(changeEvent);

            const lastCall = mockEventHandler.lastCall.args[0];
            expect(lastCall.resource).to.deep.equal(workspaceFolderUri);
        });

        test('Should handle null resource in event', async () => {
            const disposables: Disposable[] = [];
            let eventCallback: any;
            const mockEventHandler = sinon.stub();

            mockPythonEnvApi.environments.onDidChangeActiveEnvironmentPath = (callback: any) => {
                eventCallback = callback;
                return { dispose: sinon.stub() };
            };
            mockPythonEnvApi.environments.resolveEnvironment.resolves({
                executable: { uri: Uri.file('/usr/bin/python3') },
            } as ResolvedEnvironment);

            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Simulate environment path change with null resource
            const changeEvent: any = {
                id: 'test-env',
                path: '/usr/bin/python3.9',
                resource: null,
            };
            eventCallback(changeEvent);

            const lastCall = mockEventHandler.lastCall.args[0];
            expect(lastCall.path).to.deep.equal(['/usr/bin/python3.9']);
            expect(lastCall.resource).to.be.undefined; // null gets converted to undefined
        });

        test('Should handle undefined resource in event', async () => {
            const disposables: Disposable[] = [];
            let eventCallback: any;
            const mockEventHandler = sinon.stub();

            mockPythonEnvApi.environments.onDidChangeActiveEnvironmentPath = (callback: any) => {
                eventCallback = callback;
                return { dispose: sinon.stub() };
            };
            mockPythonEnvApi.environments.resolveEnvironment.resolves({
                executable: { uri: Uri.file('/usr/bin/python3') },
            } as ResolvedEnvironment);

            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Simulate environment path change with undefined resource
            const changeEvent: ActiveEnvironmentPathChangeEvent = {
                id: 'test-env',
                path: '/usr/bin/python3.9',
                resource: undefined,
            };
            eventCallback(changeEvent);

            const lastCall = mockEventHandler.lastCall.args[0];
            expect(lastCall.path).to.deep.equal(['/usr/bin/python3.9']);
            expect(lastCall.resource).to.be.undefined;
        });

        test('Should handle event with missing id', async () => {
            const disposables: Disposable[] = [];
            let eventCallback: any;
            const mockEventHandler = sinon.stub();

            mockPythonEnvApi.environments.onDidChangeActiveEnvironmentPath = (callback: any) => {
                eventCallback = callback;
                return { dispose: sinon.stub() };
            };
            mockPythonEnvApi.environments.resolveEnvironment.resolves({
                executable: { uri: Uri.file('/usr/bin/python3') },
            } as ResolvedEnvironment);

            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Simulate environment path change with missing id
            const changeEvent: any = {
                path: '/usr/bin/python3.9',
                resource: Uri.file('/workspace'),
            };
            eventCallback(changeEvent);

            const lastCall = mockEventHandler.lastCall.args[0];
            expect(lastCall.path).to.deep.equal(['/usr/bin/python3.9']);
            expect(lastCall.resource).to.deep.equal(Uri.file('/workspace'));
        });

        test('Should handle event with null path', async () => {
            const disposables: Disposable[] = [];
            let eventCallback: any;
            const mockEventHandler = sinon.stub();

            mockPythonEnvApi.environments.onDidChangeActiveEnvironmentPath = (callback: any) => {
                eventCallback = callback;
                return { dispose: sinon.stub() };
            };
            mockPythonEnvApi.environments.resolveEnvironment.resolves({
                executable: { uri: Uri.file('/usr/bin/python3') },
            } as ResolvedEnvironment);

            sinon.stub(PythonExtension, 'api').resolves(mockPythonEnvApi);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Simulate environment path change with null path
            const changeEvent: any = {
                id: 'test-env',
                path: null,
                resource: Uri.file('/workspace'),
            };
            eventCallback(changeEvent);

            const lastCall = mockEventHandler.lastCall.args[0];
            expect(lastCall.path).to.deep.equal([null]);
            expect(lastCall.resource).to.deep.equal(Uri.file('/workspace'));
        });
    });
});
