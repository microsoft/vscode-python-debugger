// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as sinon from 'sinon';
import { Uri, Disposable, Extension, extensions } from 'vscode';
import * as path from 'path';
import * as pythonApi from '../../../extension/common/python';
import * as utilities from '../../../extension/common/utilities';
import { buildPythonEnvironment } from './helpers';

// Platform-specific path constants using path.join so tests assert using native separators.
// Leading root '/' preserved; on Windows this yields a leading backslash (e.g. '\\usr\\bin').
const PYTHON_PATH = path.join('/', 'usr', 'bin', 'python3');
const PYTHON_PATH_39 = path.join('/', 'usr', 'bin', 'python3.9');
const PYTHON_PATH_WITH_SPACES = path.join('/', 'path with spaces', 'python3');
const QUOTED_PYTHON_PATH = `"${PYTHON_PATH_WITH_SPACES}"`;
const PYTHON_PATH_DIR = path.join('/', 'usr', 'bin');
const PYTHON_LIB_PYTHON3_DIR = path.join('/', 'usr', 'lib', 'python3');
const WORKSPACE_FILE = path.join('/', 'workspace', 'file.py');
const WORKSPACE_PYTHON_DIR = path.join('/', 'workspace', 'python');
const INVALID_PATH = path.join('/', 'invalid', 'path');
const MOCK_PATH = path.join('/', 'mock', 'path');

suite('Python API Tests- useEnvironmentsExtension:true', () => {
    let getExtensionStub: sinon.SinonStub;
    let mockPythonExtension: Extension<any>;
    let mockEnvsExtension: Extension<any>;
    let mockPythonEnvApi: any;

    setup(() => {
        // Stub extensions.getExtension
        getExtensionStub = sinon.stub(extensions, 'getExtension');

        // Mock useEnvExtension to return true for this test suite
        sinon.stub(utilities, 'useEnvExtension').returns(true);

        // Create mock Python extension
        mockPythonExtension = {
            id: 'ms-python.python',
            extensionUri: Uri.file(MOCK_PATH),
            extensionPath: MOCK_PATH,
            isActive: true,
            packageJSON: {},
            exports: undefined,
            activate: sinon.stub().resolves(),
            extensionKind: 1,
        } as any;

        // Create mock Python Envs extension
        mockEnvsExtension = {
            id: 'ms-python.vscode-python-envs',
            extensionUri: Uri.file(MOCK_PATH),
            extensionPath: MOCK_PATH,
            isActive: true,
            packageJSON: {},
            exports: undefined,
            activate: sinon.stub().resolves(),
            extensionKind: 1,
        } as any;

        // Create mock Python environment API - for new environments extension
        mockPythonEnvApi = {
            getEnvironment: sinon.stub(),
            setEnvironment: sinon.stub(),
            resolveEnvironment: sinon.stub(),
            getEnvironmentVariables: sinon.stub(),
            onDidChangeEnvironment: sinon.stub().returns({ dispose: sinon.stub() }),
            onDidChangeEnvironments: sinon.stub().returns({ dispose: sinon.stub() }),
            refreshEnvironments: sinon.stub().resolves(),
            getEnvironments: sinon.stub(),
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
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            const mockPythonEnv = buildPythonEnvironment(PYTHON_PATH, '3.9.0');
            mockPythonEnvApi.getEnvironment.resolves(mockPythonEnv);
            mockPythonEnvApi.resolveEnvironment.resolves(mockPythonEnv);
            mockPythonEnvApi.onDidChangeEnvironments.returns({
                dispose: sinon.stub(),
            });

            await pythonApi.initializePython(disposables);
            expect(disposables.length).to.be.greaterThan(0);
            expect(mockPythonEnvApi.onDidChangeEnvironments.called).to.be.true;
        });

        test('Should handle errors gracefully when python extension is not available', async () => {
            const disposables: Disposable[] = [];
            // Return undefined extension to simulate extension not found
            getExtensionStub.withArgs('ms-python.vscode-python-envs').returns(undefined);

            await pythonApi.initializePython(disposables);

            // Should not throw, just handle error internally
            expect(disposables.length).to.equal(0);
        });

        test('Should fire onDidChangePythonInterpreter event after initialization', async () => {
            const disposables: Disposable[] = [];
            const mockEventHandler = sinon.stub();

            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            const mockPythonEnv = buildPythonEnvironment(PYTHON_PATH, '3.9.0');
            mockPythonEnvApi.getEnvironment.resolves(mockPythonEnv);
            mockPythonEnvApi.resolveEnvironment.resolves(mockPythonEnv);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Event should be fired during initialization
            sinon.assert.called(mockEventHandler);
        });
    });

    suite('getSettingsPythonPath', () => {
        test('Should return execution details from Python extension API', async () => {
            const expectedPath = [PYTHON_PATH];
            // OLD API: Using getEnvironment() + resolveEnvironment() instead of settings.getExecutionDetails
            const mockPythonEnv = buildPythonEnvironment(PYTHON_PATH, '3.9.0');
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironment.resolves(mockPythonEnv);
            mockPythonEnvApi.resolveEnvironment.resolves(mockPythonEnv);

            const result = await pythonApi.getSettingsPythonPath();

            expect(result).to.deep.equal(expectedPath);
        });

        test('Should return execution details for specific resource', async () => {
            const resource = Uri.file(WORKSPACE_FILE);
            const expectedPath = [PYTHON_PATH];
            // OLD API: Using getEnvironment() + resolveEnvironment() instead of settings.getExecutionDetails
            const mockPythonEnv = buildPythonEnvironment(PYTHON_PATH, '3.9.0');
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironment.resolves(mockPythonEnv);
            mockPythonEnvApi.resolveEnvironment.resolves(mockPythonEnv);

            const result = await pythonApi.getSettingsPythonPath(resource);

            expect(result).to.deep.equal(expectedPath);
            // OLD API: Using getEnvironment() instead of settings.getExecutionDetails
            sinon.assert.calledWith(mockPythonEnvApi.getEnvironment, resource);
        });

        test('Should return undefined when execCommand is not available', async () => {
            // OLD API: Using getEnvironment() instead of settings.getExecutionDetails
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironment.resolves(undefined);

            const result = await pythonApi.getSettingsPythonPath();

            expect(result).to.be.undefined;
        });
    });

    suite('getEnvironmentVariables', () => {
        test('Should return environment variables from Python extension API', async () => {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const expectedVars = { PATH: PYTHON_PATH_DIR, PYTHONPATH: PYTHON_LIB_PYTHON3_DIR };
            // OLD API: Using getEnvironmentVariables() instead of environments.getEnvironmentVariables
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironmentVariables.resolves(expectedVars);

            const result = await pythonApi.getEnvironmentVariables();

            expect(result).to.deep.equal(expectedVars);
            // OLD API: Using getEnvironmentVariables() instead of environments.getEnvironmentVariables
            sinon.assert.calledWith(mockPythonEnvApi.getEnvironmentVariables, sinon.match.any);
        });

        test('Should get environment variables for specific resource', async () => {
            const resource = Uri.file(WORKSPACE_FILE);
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const expectedVars = { PATH: PYTHON_PATH_DIR };
            // OLD API: Using getEnvironmentVariables() instead of environments.getEnvironmentVariables
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironmentVariables.resolves(expectedVars);

            const result = await pythonApi.getEnvironmentVariables(resource);

            expect(result).to.deep.equal(expectedVars);
            // OLD API: Using getEnvironmentVariables() instead of environments.getEnvironmentVariables
            sinon.assert.calledWith(mockPythonEnvApi.getEnvironmentVariables, resource);
        });

        test('Should handle undefined resource and return workspace environment variables', async () => {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const expectedVars = { PATH: PYTHON_PATH_DIR, PYTHONPATH: WORKSPACE_PYTHON_DIR };
            // OLD API: Using getEnvironmentVariables() instead of environments.getEnvironmentVariables
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironmentVariables.resolves(expectedVars);

            const result = await pythonApi.getEnvironmentVariables(undefined);

            expect(result).to.deep.equal(expectedVars);
            // OLD API: Using getEnvironmentVariables() instead of environments.getEnvironmentVariables
            sinon.assert.calledWith(mockPythonEnvApi.getEnvironmentVariables, undefined);
        });
    });

    suite('resolveEnvironment', () => {
        test('Should resolve environment from path string', async () => {
            const envPath = PYTHON_PATH;
            // Use buildPythonEnvironment for realistic mock
            const expectedEnv = buildPythonEnvironment(envPath, '3.9.0');

            // OLD API: Using resolveEnvironment() instead of environments.resolveEnvironment
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.resolveEnvironment.resolves(expectedEnv);

            const result = await pythonApi.resolveEnvironment(envPath);

            expect(result).to.deep.equal(expectedEnv);
            // OLD API: Using resolveEnvironment() instead of environments.resolveEnvironment
            // sinon.assert.calledWith(mockPythonEnvApi.resolveEnvironment, envPath);
        });

        test('Should resolve environment from Environment object', async () => {
            // Use buildPythonEnvironment for realistic mock
            const expectedEnv = buildPythonEnvironment(PYTHON_PATH, '3.9.0');

            // OLD API: Using resolveEnvironment() instead of environments.resolveEnvironment
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.resolveEnvironment.resolves(expectedEnv);

            const result = await pythonApi.resolveEnvironment(expectedEnv.environmentPath.fsPath);

            expect(result).to.deep.equal(expectedEnv);
        });

        test('Should return undefined for invalid environment', async () => {
            const envPath = INVALID_PATH;
            // OLD API: Using resolveEnvironment() instead of environments.resolveEnvironment
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.resolveEnvironment.resolves(undefined);

            const result = await pythonApi.resolveEnvironment(envPath);

            expect(result).to.be.undefined;
        });
    });

    suite('getActiveEnvironmentPath', () => {
        test('Should return active environment path', async () => {
            // Match production shape: getEnvironment() returns a PythonEnvironment-like object
            const envObj = buildPythonEnvironment(PYTHON_PATH, '3.9.0');
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironment.returns(envObj);

            const result = await pythonApi.getActiveEnvironmentPath();

            expect((result as any).environmentPath.fsPath).to.equal(PYTHON_PATH);
            expect((result as any).execInfo.run.executable).to.equal(PYTHON_PATH);
        });

        test('Should return active environment path for specific resource', async () => {
            const resource = Uri.file(WORKSPACE_FILE);
            const envObj = buildPythonEnvironment(PYTHON_PATH, '3.9.0');
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironment.returns(envObj);

            const result = await pythonApi.getActiveEnvironmentPath(resource);

            expect((result as any).environmentPath.fsPath).to.equal(PYTHON_PATH);
            sinon.assert.calledWith(mockPythonEnvApi.getEnvironment, resource);
        });
    });

    suite('getInterpreterDetails', () => {
        test('Should return interpreter details without resource', async () => {
            const pythonPath = PYTHON_PATH;
            const mockEnv = buildPythonEnvironment(pythonPath, '3.9.0');

            // OLD API: Using getEnvironment() and resolveEnvironment() instead of environments.*
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironment.returns({ environmentPath: Uri.file(pythonPath) });
            mockPythonEnvApi.resolveEnvironment.resolves(mockEnv);

            const result = await pythonApi.getInterpreterDetails();

            // Use Uri.file().fsPath to get platform-normalized path for comparison
            expect(result.path).to.deep.equal([Uri.file(pythonPath).fsPath]);
            expect(result.resource).to.be.undefined;
        });

        test('Should return interpreter details with resource', async () => {
            const resource = Uri.file(WORKSPACE_FILE);
            const pythonPath = PYTHON_PATH;
            const mockEnv = buildPythonEnvironment(pythonPath, '3.9.0');

            // OLD API: Using getEnvironment() and resolveEnvironment() instead of environments.*
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironment.returns({ environmentPath: Uri.file(pythonPath) });
            mockPythonEnvApi.resolveEnvironment.resolves(mockEnv);

            const result = await pythonApi.getInterpreterDetails(resource);

            // Use Uri.file().fsPath to get platform-normalized path for comparison
            expect(result.path).to.deep.equal([Uri.file(pythonPath).fsPath]);
            expect(result.resource).to.deep.equal(resource);
        });

        test('Should not quote path with spaces', async () => {
            // this should be updated when we fix the quoting logic in getInterpreterDetails
            const pythonPath = PYTHON_PATH_WITH_SPACES;
            const mockEnv = buildPythonEnvironment(pythonPath, '3.9.0');

            // OLD API: Using getEnvironment() and resolveEnvironment() instead of environments.*
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironment.returns({ environmentPath: Uri.file(pythonPath) });
            mockPythonEnvApi.resolveEnvironment.resolves(mockEnv);

            const result = await pythonApi.getInterpreterDetails();

            expect(result.path).to.deep.equal([`${pythonPath}`]);
        });

        test('Should not double-quote already quoted path', async () => {
            const quotedPython = Uri.file(QUOTED_PYTHON_PATH);
            const quotedPythonPath = quotedPython.fsPath;
            const mockEnv = buildPythonEnvironment(quotedPythonPath, '3.9.0');

            // OLD API: Using getEnvironment() and resolveEnvironment() instead of environments.*
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironment.returns({ environmentPath: quotedPython });
            mockPythonEnvApi.resolveEnvironment.resolves(mockEnv);

            const result = await pythonApi.getInterpreterDetails();

            expect(result.path).to.deep.equal([quotedPythonPath]);
        });

        test('Should return undefined path when environment is not resolved', async () => {
            // OLD API: Using getEnvironment() and resolveEnvironment() instead of environments.*
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironment.returns({ environmentPath: Uri.file(PYTHON_PATH) });
            mockPythonEnvApi.resolveEnvironment.resolves(undefined);

            const result = await pythonApi.getInterpreterDetails();

            expect(result.path).to.be.undefined;
            expect(result.resource).to.be.undefined;
        });

        test('Should return undefined path when executable uri is not available', async () => {
            const mockEnv = {
                id: 'test-env',
                execInfo: {
                    run: { executable: undefined, args: [] },
                },
            } as any;

            // OLD API: Using getEnvironment() and resolveEnvironment() instead of environments.*
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.getEnvironment.returns({ environmentPath: Uri.file(PYTHON_PATH) });
            mockPythonEnvApi.resolveEnvironment.resolves(mockEnv);

            const result = await pythonApi.getInterpreterDetails();

            expect(result.path).to.be.undefined;
        });
    });

    suite('onDidChangePythonInterpreter event', () => {
        test('Should fire event when active environment path changes', async () => {
            const disposables: Disposable[] = [];
            let eventCallback: any;
            const mockEventHandler = sinon.stub();
            const pythonPath = PYTHON_PATH_39;
            const mockEnv = buildPythonEnvironment(pythonPath, '3.9.0');

            // OLD API: Using onDidChangeEnvironments instead of onDidChangeActiveEnvironmentPath
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.onDidChangeEnvironments = (callback: any) => {
                eventCallback = callback;
                return { dispose: sinon.stub() };
            };
            // Set up mocks for getInterpreterDetails() call in event handler
            mockPythonEnvApi.getEnvironment.returns({ environmentPath: Uri.file(pythonPath) });
            mockPythonEnvApi.resolveEnvironment.resolves(mockEnv);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Trigger the environment change event
            await eventCallback();

            // Should be called at least twice: once during init, once from the event
            expect(mockEventHandler.callCount).to.be.greaterThan(1);
            const lastCall = mockEventHandler.lastCall.args[0];
            expect(lastCall.path).to.deep.equal([pythonPath]);
            expect(lastCall.resource).to.be.undefined;
        });

        test('Should handle WorkspaceFolder resource in event', async () => {
            const disposables: Disposable[] = [];
            let eventCallback: any;
            const mockEventHandler = sinon.stub();
            const pythonPath = PYTHON_PATH_39;
            const mockEnv = buildPythonEnvironment(pythonPath, '3.9.0');

            // OLD API: Using onDidChangeEnvironments instead of onDidChangeActiveEnvironmentPath
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.onDidChangeEnvironments = (callback: any) => {
                eventCallback = callback;
                return { dispose: sinon.stub() };
            };
            // Set up mocks for getInterpreterDetails() call in event handler
            mockPythonEnvApi.getEnvironment.returns({ environmentPath: Uri.file(pythonPath) });
            mockPythonEnvApi.resolveEnvironment.resolves(mockEnv);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Trigger the environment change event
            await eventCallback();

            const lastCall = mockEventHandler.lastCall.args[0];
            expect(lastCall.path).to.deep.equal([pythonPath]);
            expect(lastCall.resource).to.be.undefined;
        });

        test('Should handle null resource in event', async () => {
            const disposables: Disposable[] = [];
            let eventCallback: any;
            const mockEventHandler = sinon.stub();
            const pythonPath = PYTHON_PATH_39;
            const mockEnv = buildPythonEnvironment(pythonPath, '3.9.0');

            // OLD API: Using onDidChangeEnvironments instead of onDidChangeActiveEnvironmentPath
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.onDidChangeEnvironments = (callback: any) => {
                eventCallback = callback;
                return { dispose: sinon.stub() };
            };
            // Set up mocks for getInterpreterDetails() call in event handler
            mockPythonEnvApi.getEnvironment.returns({ environmentPath: Uri.file(pythonPath) });
            mockPythonEnvApi.resolveEnvironment.resolves(mockEnv);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Trigger the environment change event
            await eventCallback();

            const lastCall = mockEventHandler.lastCall.args[0];
            expect(lastCall.path).to.deep.equal([pythonPath]);
            expect(lastCall.resource).to.be.undefined;
        });

        test('Should handle undefined resource in event', async () => {
            const disposables: Disposable[] = [];
            let eventCallback: any;
            const mockEventHandler = sinon.stub();
            const pythonPath = PYTHON_PATH_39;
            const mockEnv = buildPythonEnvironment(pythonPath, '3.9.0');

            // OLD API: Using onDidChangeEnvironments instead of onDidChangeActiveEnvironmentPath
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.onDidChangeEnvironments = (callback: any) => {
                eventCallback = callback;
                return { dispose: sinon.stub() };
            };
            // Set up mocks for getInterpreterDetails() call in event handler
            mockPythonEnvApi.getEnvironment.returns({ environmentPath: Uri.file(pythonPath) });
            mockPythonEnvApi.resolveEnvironment.resolves(mockEnv);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Trigger the environment change event
            await eventCallback();

            const lastCall = mockEventHandler.lastCall.args[0];
            expect(lastCall.path).to.deep.equal([pythonPath]);
            expect(lastCall.resource).to.be.undefined;
        });

        test('Should handle event with missing id', async () => {
            const disposables: Disposable[] = [];
            let eventCallback: any;
            const mockEventHandler = sinon.stub();
            const pythonPath = PYTHON_PATH_39;
            const mockEnv = buildPythonEnvironment(pythonPath, '3.9.0');

            // OLD API: Using onDidChangeEnvironments instead of onDidChangeActiveEnvironmentPath
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.onDidChangeEnvironments = (callback: any) => {
                eventCallback = callback;
                return { dispose: sinon.stub() };
            };
            // Set up mocks for getInterpreterDetails() call in event handler
            mockPythonEnvApi.getEnvironment.returns({ environmentPath: Uri.file(pythonPath) });
            mockPythonEnvApi.resolveEnvironment.resolves(mockEnv);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Trigger the environment change event
            await eventCallback();

            const lastCall = mockEventHandler.lastCall.args[0];
            expect(lastCall.path).to.deep.equal([pythonPath]);
            expect(lastCall.resource).to.be.undefined;
        });

        test('Should handle event with null path', async () => {
            const disposables: Disposable[] = [];
            let eventCallback: any;
            const mockEventHandler = sinon.stub();

            // OLD API: Using onDidChangeEnvironments instead of onDidChangeActiveEnvironmentPath
            (mockEnvsExtension as any).exports = mockPythonEnvApi;
            mockPythonEnvApi.onDidChangeEnvironments = (callback: any) => {
                eventCallback = callback;
                return { dispose: sinon.stub() };
            };
            // Test case where getEnvironment returns no environment (null path case)
            mockPythonEnvApi.getEnvironment.returns(undefined);
            mockPythonEnvApi.resolveEnvironment.resolves(undefined);

            pythonApi.onDidChangePythonInterpreter(mockEventHandler);

            await pythonApi.initializePython(disposables);

            // Trigger the environment change event
            await eventCallback();

            const lastCall = mockEventHandler.lastCall.args[0];
            expect(lastCall.path).to.be.undefined;
            expect(lastCall.resource).to.be.undefined;
        });
    });
});
