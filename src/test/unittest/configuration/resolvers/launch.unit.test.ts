// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as TypeMoq from 'typemoq';
import * as sinon from 'sinon';
import {
    DebugConfiguration,
    DebugConfigurationProvider,
    TextDocument,
    TextEditor,
    Uri,
    WorkspaceConfiguration,
    WorkspaceFolder,
} from 'vscode';
import { PYTHON_LANGUAGE } from '../../../../extension/common/constants';
import { LaunchConfigurationResolver } from '../../../../extension/debugger/configuration/resolvers/launch';
import { getInfoPerOS } from './common';
import * as vscodeapi from '../../../../extension/common/vscodeapi';
import * as platform from '../../../../extension/common/platform';
import { ConsoleType, DebugOptions, LaunchRequestArguments } from '../../../../extension/types';
import { DebuggerTypeName } from '../../../../extension/constants';
import * as pythonApi from '../../../../extension/common/python';
import * as settings from '../../../../extension/common/settings';
import * as helper from '../../../../extension/debugger/configuration/resolvers/helper';
import { debuggerTypeName } from '../../../common';

getInfoPerOS().forEach(([osName, osType, path]) => {
    if (osType === platform.OSType.Unknown) {
        return;
    }

    suite(`Debugging - Config Resolver Launch, OS = ${osName}`, () => {
        let debugProvider: DebugConfigurationProvider;
        let getActiveTextEditorStub: sinon.SinonStub;
        let getOSTypeStub: sinon.SinonStub;
        let getWorkspaceFolderStub: sinon.SinonStub;
        let getInterpreterDetailsStub: sinon.SinonStub;
        let getEnvFileStub: sinon.SinonStub;
        let getDebugEnvironmentVariablesStub: sinon.SinonStub;
        let getConfigurationStub: sinon.SinonStub;

        setup(() => {
            getActiveTextEditorStub = sinon.stub(vscodeapi, 'getActiveTextEditor');
            getOSTypeStub = sinon.stub(platform, 'getOSType');
            getWorkspaceFolderStub = sinon.stub(vscodeapi, 'getWorkspaceFolders');
            getOSTypeStub.returns(osType);
            getInterpreterDetailsStub = sinon.stub(pythonApi, 'getInterpreterDetails');
            getEnvFileStub = sinon.stub(settings, 'getEnvFile');
            getDebugEnvironmentVariablesStub = sinon.stub(helper, 'getDebugEnvironmentVariables');
            getConfigurationStub = sinon.stub(vscodeapi, 'getConfiguration');
            getConfigurationStub.withArgs('debugpy', sinon.match.any).returns(createMoqConfiguration(true));
        });

        teardown(() => {
            sinon.restore();
        });

        function createMoqWorkspaceFolder(folderPath: string) {
            const folder = TypeMoq.Mock.ofType<WorkspaceFolder>();
            folder.setup((f) => f.uri).returns(() => Uri.file(folderPath));
            return folder.object;
        }

        function createMoqConfiguration(justMyCode: boolean) {
            const debugpySettings = TypeMoq.Mock.ofType<WorkspaceConfiguration>();
            debugpySettings
                .setup((p) => p.get<boolean>('debugJustMyCode', TypeMoq.It.isAny()))
                .returns(() => justMyCode);
            return debugpySettings.object;
        }

        function getClientOS() {
            return osType === platform.OSType.Windows ? 'windows' : 'unix';
        }

        function setupIoc(pythonPath: string, workspaceFolder?: WorkspaceFolder) {
            getInterpreterDetailsStub.resolves({ path: [pythonPath] });

            if (workspaceFolder) {
                getEnvFileStub
                    .withArgs('python', sinon.match.any)
                    .returns(path.join(workspaceFolder!.uri.fsPath, '.env2'));
            }
            getDebugEnvironmentVariablesStub.returns(() => Promise.resolve({}));
            debugProvider = new LaunchConfigurationResolver();
        }

        function setupActiveEditor(fileName: string | undefined, languageId: string) {
            if (fileName) {
                const textEditor = TypeMoq.Mock.ofType<TextEditor>();
                const document = TypeMoq.Mock.ofType<TextDocument>();
                document.setup((d) => d.languageId).returns(() => languageId);
                document.setup((d) => d.fileName).returns(() => fileName);
                textEditor.setup((t) => t.document).returns(() => document.object);
                getActiveTextEditorStub.returns(textEditor.object);
            } else {
                getActiveTextEditorStub.returns(undefined);
            }
        }

        function setupWorkspaces(folders: string[]) {
            const workspaceFolders = folders.map(createMoqWorkspaceFolder);
            getWorkspaceFolderStub.returns(workspaceFolders);
        }

        const launch: LaunchRequestArguments = {
            name: 'Python launch',
            type: debuggerTypeName,
            request: 'launch',
        };

        async function resolveDebugConfiguration(
            workspaceFolder: WorkspaceFolder | undefined,
            launchConfig: Partial<LaunchRequestArguments>,
        ) {
            let config = await debugProvider.resolveDebugConfiguration!(
                workspaceFolder,
                launchConfig as DebugConfiguration,
            );
            if (config === undefined || config === null) {
                return config;
            }
            const interpreterPath = await pythonApi.getActiveEnvironmentPath(
                workspaceFolder ? workspaceFolder.uri : undefined,
            );
            for (const key of Object.keys(config)) {
                const value = config[key];
                if (typeof value === 'string') {
                    config[key] = value.replace(
                        '${command:python.interpreterPath}',
                        interpreterPath ? interpreterPath.path : '',
                    );
                }
            }

            config = await debugProvider.resolveDebugConfigurationWithSubstitutedVariables!(workspaceFolder, config);
            if (config === undefined || config === null) {
                return config;
            }

            return config as LaunchRequestArguments;
        }

        test('Defaults should be returned when an empty object is passed with a Workspace Folder and active file', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            const pythonFile = 'xyz.py';
            setupIoc(pythonPath, workspaceFolder);
            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {});

            expect(Object.keys(debugConfig!)).to.have.lengthOf.above(3);
            expect(debugConfig).to.have.property('type', debuggerTypeName);
            expect(debugConfig).to.have.property('request', 'launch');
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.not.have.property('pythonPath');
            expect(debugConfig).to.have.property('python', pythonPath);
            expect(debugConfig).to.have.property('debugAdapterPython', pythonPath);
            expect(debugConfig).to.have.property('debugLauncherPython', pythonPath);
            expect(debugConfig).to.have.property('program', pythonFile);
            expect(debugConfig).to.have.property('cwd');
            expect(debugConfig!.cwd!.toLowerCase()).to.be.equal(__dirname.toLowerCase());
            expect(debugConfig).to.have.property('envFile');
            expect(debugConfig!.envFile!.toLowerCase()).to.be.equal(path.join(__dirname, '.env2').toLowerCase());
            expect(debugConfig).to.have.property('env');

            expect(Object.keys((debugConfig as DebugConfiguration).env)).to.have.lengthOf(0);
        });

        test("Defaults should be returned when an object with 'noDebug' property is passed with a Workspace Folder and active file", async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            const pythonFile = 'xyz.py';
            setupIoc(pythonPath, workspaceFolder);
            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                noDebug: true,
            });

            expect(Object.keys(debugConfig!)).to.have.lengthOf.above(3);
            expect(debugConfig).to.have.property('type', debuggerTypeName);
            expect(debugConfig).to.have.property('request', 'launch');
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.not.have.property('pythonPath');
            expect(debugConfig).to.have.property('python', pythonPath);
            expect(debugConfig).to.have.property('debugAdapterPython', pythonPath);
            expect(debugConfig).to.have.property('debugLauncherPython', pythonPath);
            expect(debugConfig).to.have.property('program', pythonFile);
            expect(debugConfig).to.have.property('cwd');
            expect(debugConfig!.cwd!.toLowerCase()).to.be.equal(__dirname.toLowerCase());
            expect(debugConfig).to.have.property('envFile');
            expect(debugConfig!.envFile!.toLowerCase()).to.be.equal(path.join(__dirname, '.env2').toLowerCase());
            expect(debugConfig).to.have.property('env');

            expect(Object.keys((debugConfig as DebugConfiguration).env)).to.have.lengthOf(0);
        });

        test('Defaults should be returned when an empty object is passed without Workspace Folder, no workspaces and active file', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const pythonFile = 'xyz.py';
            setupIoc(pythonPath, createMoqWorkspaceFolder(path.dirname(pythonFile)));
            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);
            setupWorkspaces([]);

            const debugConfig = await resolveDebugConfiguration(undefined, {});
            const filePath = Uri.file(path.dirname('')).fsPath;

            expect(Object.keys(debugConfig!)).to.have.lengthOf.above(3);
            expect(debugConfig).to.have.property('type', debuggerTypeName);
            expect(debugConfig).to.have.property('request', 'launch');
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.not.have.property('pythonPath');
            expect(debugConfig).to.have.property('python', pythonPath);
            expect(debugConfig).to.have.property('debugAdapterPython', pythonPath);
            expect(debugConfig).to.have.property('debugLauncherPython', pythonPath);
            expect(debugConfig).to.have.property('program', pythonFile);
            expect(debugConfig).to.have.property('cwd');
            expect(debugConfig!.cwd!.toLowerCase()).to.be.equal(filePath.toLowerCase());
            expect(debugConfig).to.have.property('envFile');
            expect(debugConfig!.envFile!.toLowerCase()).to.be.equal(path.join(filePath, '.env2').toLowerCase());
            expect(debugConfig).to.have.property('env');

            expect(Object.keys((debugConfig as DebugConfiguration).env)).to.have.lengthOf(0);
        });

        test('Defaults should be returned when an empty object is passed without Workspace Folder, no workspaces and no active file', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            setupIoc(pythonPath);
            setupActiveEditor(undefined, PYTHON_LANGUAGE);
            setupWorkspaces([]);

            const debugConfig = await resolveDebugConfiguration(undefined, {});

            expect(Object.keys(debugConfig!)).to.have.lengthOf.above(3);
            expect(debugConfig).to.have.property('type', debuggerTypeName);
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.not.have.property('pythonPath');
            expect(debugConfig).to.have.property('python', pythonPath);
            expect(debugConfig).to.have.property('debugAdapterPython', pythonPath);
            expect(debugConfig).to.have.property('debugLauncherPython', pythonPath);
            expect(debugConfig).to.have.property('request', 'launch');
            expect(debugConfig).to.have.property('program', '');
            expect(debugConfig).not.to.have.property('cwd');
            expect(debugConfig).not.to.have.property('envFile');
            expect(debugConfig).to.have.property('env');

            expect(Object.keys((debugConfig as DebugConfiguration).env)).to.have.lengthOf(0);
        });

        test('Defaults should be returned when an empty object is passed without Workspace Folder, no workspaces and non python file', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const activeFile = 'xyz.js';
            setupIoc(pythonPath);
            setupActiveEditor(activeFile, 'javascript');
            setupWorkspaces([]);

            const debugConfig = await resolveDebugConfiguration(undefined, {});

            expect(Object.keys(debugConfig!)).to.have.lengthOf.above(3);
            expect(debugConfig).to.have.property('type', debuggerTypeName);
            expect(debugConfig).to.have.property('request', 'launch');
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.not.have.property('pythonPath');
            expect(debugConfig).to.have.property('python', pythonPath);
            expect(debugConfig).to.have.property('debugAdapterPython', pythonPath);
            expect(debugConfig).to.have.property('debugLauncherPython', pythonPath);
            expect(debugConfig).to.have.property('program', '');
            expect(debugConfig).not.to.have.property('cwd');
            expect(debugConfig).not.to.have.property('envFile');
            expect(debugConfig).to.have.property('env');

            expect(Object.keys((debugConfig as DebugConfiguration).env)).to.have.lengthOf(0);
        });

        test('Defaults should be returned when an empty object is passed without Workspace Folder, with a workspace and an active python file', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const activeFile = 'xyz.py';
            const defaultWorkspace = path.join('usr', 'desktop');
            setupIoc(pythonPath, createMoqWorkspaceFolder(defaultWorkspace));
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            setupWorkspaces([defaultWorkspace]);

            const debugConfig = await resolveDebugConfiguration(undefined, {});
            const filePath = Uri.file(defaultWorkspace).fsPath;

            expect(Object.keys(debugConfig!)).to.have.lengthOf.above(3);
            expect(debugConfig).to.have.property('type', debuggerTypeName);
            expect(debugConfig).to.have.property('request', 'launch');
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.not.have.property('pythonPath');
            expect(debugConfig).to.have.property('python', pythonPath);
            expect(debugConfig).to.have.property('debugAdapterPython', pythonPath);
            expect(debugConfig).to.have.property('debugLauncherPython', pythonPath);
            expect(debugConfig).to.have.property('program', activeFile);
            expect(debugConfig).to.have.property('cwd');
            expect(debugConfig!.cwd!.toLowerCase()).to.be.equal(filePath.toLowerCase());
            expect(debugConfig).to.have.property('envFile');
            expect(debugConfig!.envFile!.toLowerCase()).to.be.equal(path.join(filePath, '.env2').toLowerCase());
            expect(debugConfig).to.have.property('env');

            expect(Object.keys((debugConfig as DebugConfiguration).env)).to.have.lengthOf(0);
        });

        test("Ensure 'port' is left unaltered", async () => {
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor('spam.py', PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const port = 12341234;
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                port,
            });

            expect(debugConfig).to.have.property('port', port);
        });

        test("Ensure 'localRoot' is left unaltered", async () => {
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor('spam.py', PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const localRoot = `Debug_PythonPath_${new Date().toString()}`;
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                localRoot,
            });

            expect(debugConfig).to.have.property('localRoot', localRoot);
        });

        test("Ensure 'remoteRoot' is left unaltered", async () => {
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor('spam.py', PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const remoteRoot = `Debug_PythonPath_${new Date().toString()}`;
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                remoteRoot,
            });

            expect(debugConfig).to.have.property('remoteRoot', remoteRoot);
        });

        test("Ensure 'localRoot' and 'remoteRoot' are not used", async () => {
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor('spam.py', PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const localRoot = `Debug_PythonPath_Local_Root_${new Date().toString()}`;
            const remoteRoot = `Debug_PythonPath_Remote_Root_${new Date().toString()}`;
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                localRoot,
                remoteRoot,
            });

            expect(debugConfig!.pathMappings).to.be.equal(undefined, 'unexpected pathMappings');
        });

        test('Ensure non-empty path mappings are used', async () => {
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor('spam.py', PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const expected = {
                localRoot: `Debug_PythonPath_Local_Root_${new Date().toString()}`,
                remoteRoot: `Debug_PythonPath_Remote_Root_${new Date().toString()}`,
            };
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                pathMappings: [expected],
            });

            const { pathMappings } = debugConfig as LaunchRequestArguments;
            expect(pathMappings).to.be.deep.equal([expected]);
        });

        test('Ensure replacement in path mappings happens', async () => {
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor('spam.py', PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                pathMappings: [
                    {
                        localRoot: '${workspaceFolder}/spam',
                        remoteRoot: '${workspaceFolder}/spam',
                    },
                ],
            });

            const { pathMappings } = debugConfig as LaunchRequestArguments;
            expect(pathMappings).to.be.deep.equal([
                {
                    localRoot: `${workspaceFolder.uri.fsPath}/spam`,
                    remoteRoot: '${workspaceFolder}/spam',
                },
            ]);
        });

        test('Ensure path mappings are not automatically added if missing', async () => {
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor('spam.py', PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);
            const localRoot = `Debug_PythonPath_${new Date().toString()}`;

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                localRoot,
            });

            const { pathMappings } = debugConfig as LaunchRequestArguments;
            expect(pathMappings).to.be.equal(undefined, 'unexpected pathMappings');
        });

        test('Ensure path mappings are not automatically added if empty', async () => {
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor('spam.py', PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);
            const localRoot = `Debug_PythonPath_${new Date().toString()}`;

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                localRoot,
                pathMappings: [],
            });

            const { pathMappings } = debugConfig as LaunchRequestArguments;
            expect(pathMappings).to.be.equal(undefined, 'unexpected pathMappings');
        });

        test('Ensure path mappings are not automatically added to existing', async () => {
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor('spam.py', PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);
            const localRoot = `Debug_PythonPath_${new Date().toString()}`;

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                localRoot,
                pathMappings: [
                    {
                        localRoot: '/spam',
                        remoteRoot: '.',
                    },
                ],
            });

            expect(debugConfig).to.have.property('localRoot', localRoot);
            const { pathMappings } = debugConfig as LaunchRequestArguments;
            expect(pathMappings).to.be.deep.equal([
                {
                    localRoot: '/spam',
                    remoteRoot: '.',
                },
            ]);
        });

        test('Ensure drive letter is lower cased for local path mappings on Windows when with existing path mappings', async function () {
            if (platform.getOSType() !== platform.OSType.Windows || osType !== platform.OSType.Windows) {
                return this.skip();
            }
            const workspaceFolder = createMoqWorkspaceFolder(path.join('C:', 'Debug', 'Python_Path'));
            setupActiveEditor('spam.py', PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);
            const localRoot = Uri.file(path.join(workspaceFolder.uri.fsPath, 'app')).fsPath;

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                pathMappings: [
                    {
                        localRoot,
                        remoteRoot: '/app/',
                    },
                ],
            });

            const { pathMappings } = debugConfig as LaunchRequestArguments;
            const expected = Uri.file(`c${localRoot.substring(1)}`).fsPath;
            expect(pathMappings).to.deep.equal([
                {
                    localRoot: expected,
                    remoteRoot: '/app/',
                },
            ]);
            return undefined;
        });

        test('Ensure drive letter is not lower cased for local path mappings on non-Windows when with existing path mappings', async function () {
            if (platform.getOSType() === platform.OSType.Windows || osType === platform.OSType.Windows) {
                return this.skip();
            }
            const workspaceFolder = createMoqWorkspaceFolder(path.join('USR', 'Debug', 'Python_Path'));
            setupActiveEditor('spam.py', PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);
            const localRoot = Uri.file(path.join(workspaceFolder.uri.fsPath, 'app')).fsPath;

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                pathMappings: [
                    {
                        localRoot,
                        remoteRoot: '/app/',
                    },
                ],
            });

            const { pathMappings } = debugConfig as LaunchRequestArguments;
            expect(pathMappings).to.deep.equal([
                {
                    localRoot,
                    remoteRoot: '/app/',
                },
            ]);
            return undefined;
        });

        test('Ensure local path mappings are not modified when not pointing to a local drive', async () => {
            const workspaceFolder = createMoqWorkspaceFolder(path.join('Server', 'Debug', 'Python_Path'));
            setupActiveEditor('spam.py', PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                pathMappings: [
                    {
                        localRoot: '/spam',
                        remoteRoot: '.',
                    },
                ],
            });

            const { pathMappings } = debugConfig as LaunchRequestArguments;
            expect(pathMappings).to.deep.equal([
                {
                    localRoot: '/spam',
                    remoteRoot: '.',
                },
            ]);
        });

        test('Ensure `${command:python.interpreterPath}` is replaced with actual pythonPath', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const activeFile = 'xyz.py';
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupIoc(pythonPath);
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                pythonPath: '${command:python.interpreterPath}',
            });

            expect(debugConfig).to.not.have.property('pythonPath');
            expect(debugConfig).to.have.property('python', pythonPath);
            expect(debugConfig).to.have.property('debugAdapterPython', pythonPath);
            expect(debugConfig).to.have.property('debugLauncherPython', pythonPath);
        });

        test('Ensure `${command:python.interpreterPath}` substitution is properly handled', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const activeFile = 'xyz.py';
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupIoc(pythonPath);
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                python: '${command:python.interpreterPath}',
            });

            expect(debugConfig).to.not.have.property('pythonPath');
            expect(debugConfig).to.have.property('python', pythonPath);
            expect(debugConfig).to.have.property('debugAdapterPython', pythonPath);
            expect(debugConfig).to.have.property('debugLauncherPython', pythonPath);
        });

        test('Ensure hardcoded pythonPath is left unaltered', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const activeFile = 'xyz.py';
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupIoc(pythonPath);
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const debugPythonPath = `Debug_PythonPath_${new Date().toString()}`;
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                pythonPath: debugPythonPath,
            });

            expect(debugConfig).to.not.have.property('pythonPath');
            expect(debugConfig).to.have.property('python', debugPythonPath);
            expect(debugConfig).to.have.property('debugAdapterPython', debugPythonPath);
            expect(debugConfig).to.have.property('debugLauncherPython', debugPythonPath);
        });

        test('Ensure hardcoded "python" is left unaltered', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const activeFile = 'xyz.py';
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupIoc(pythonPath);
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const debugPythonPath = `Debug_PythonPath_${new Date().toString()}`;
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                python: debugPythonPath,
            });

            expect(debugConfig).to.not.have.property('pythonPath');
            expect(debugConfig).to.have.property('python', debugPythonPath);
            expect(debugConfig).to.have.property('debugAdapterPython', pythonPath);
            expect(debugConfig).to.have.property('debugLauncherPython', pythonPath);
        });

        test('Ensure hardcoded "debugAdapterPython" is left unaltered', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const activeFile = 'xyz.py';
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupIoc(pythonPath);
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const debugPythonPath = `Debug_PythonPath_${new Date().toString()}`;
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                debugAdapterPython: debugPythonPath,
            });

            expect(debugConfig).to.not.have.property('pythonPath');
            expect(debugConfig).to.have.property('python', pythonPath);
            expect(debugConfig).to.have.property('debugAdapterPython', debugPythonPath);
            expect(debugConfig).to.have.property('debugLauncherPython', pythonPath);
        });

        test('Ensure hardcoded "debugLauncherPython" is left unaltered', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const activeFile = 'xyz.py';
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupIoc(pythonPath);
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const debugPythonPath = `Debug_PythonPath_${new Date().toString()}`;
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                debugLauncherPython: debugPythonPath,
            });

            expect(debugConfig).to.not.have.property('pythonPath');
            expect(debugConfig).to.have.property('python', pythonPath);
            expect(debugConfig).to.have.property('debugAdapterPython', pythonPath);
            expect(debugConfig).to.have.property('debugLauncherPython', debugPythonPath);
        });

        test('Test defaults of debugger', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            const pythonFile = 'xyz.py';
            setupIoc(pythonPath);
            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
            });

            expect(debugConfig).to.have.property('console', 'integratedTerminal');
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.have.property('stopOnEntry', false);
            expect(debugConfig).to.have.property('showReturnValue', true);
            expect(debugConfig).to.have.property('debugOptions');
            const expectedOptions = [DebugOptions.ShowReturnValue];
            if (osType === platform.OSType.Windows) {
                expectedOptions.push(DebugOptions.FixFilePathCase);
            }
            expect((debugConfig as DebugConfiguration).debugOptions).to.be.deep.equal(expectedOptions);
        });

        test('Test defaults of python debugger', async () => {
            if (DebuggerTypeName === debuggerTypeName) {
                return;
            }
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            const pythonFile = 'xyz.py';
            setupIoc(pythonPath);
            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
            });

            expect(debugConfig).to.have.property('stopOnEntry', false);
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.have.property('showReturnValue', true);
            expect(debugConfig).to.have.property('debugOptions');
            expect((debugConfig as DebugConfiguration).debugOptions).to.be.deep.equal([]);
        });

        test('Test overriding defaults of debugger', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            const pythonFile = 'xyz.py';
            setupIoc(pythonPath);
            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                redirectOutput: true,
                justMyCode: false,
            });

            expect(debugConfig).to.have.property('console', 'integratedTerminal');
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.have.property('stopOnEntry', false);
            expect(debugConfig).to.have.property('showReturnValue', true);
            expect(debugConfig).to.have.property('redirectOutput', true);
            expect(debugConfig).to.have.property('justMyCode', false);
            expect(debugConfig).to.have.property('debugOptions');
            const expectedOptions = [DebugOptions.ShowReturnValue, DebugOptions.RedirectOutput];
            if (osType === platform.OSType.Windows) {
                expectedOptions.push(DebugOptions.FixFilePathCase);
            }
            expect((debugConfig as DebugConfiguration).debugOptions).to.be.deep.equal(expectedOptions);
        });

        const testsForJustMyCode = [
            {
                justMyCode: false,
                justMyCodeSetting: true,
                expectedResult: false,
            },
            {
                justMyCode: false,
                justMyCodeSetting: false,
                expectedResult: false,
            },
            {
                justMyCode: true,
                justMyCodeSetting: false,
                expectedResult: true,
            },
            {
                justMyCode: true,
                justMyCodeSetting: true,
                expectedResult: true,
            },
            {
                justMyCode: undefined,
                justMyCodeSetting: false,
                expectedResult: false,
            },
            {
                justMyCode: undefined,
                justMyCodeSetting: true,
                expectedResult: true,
            },
        ];
        testsForJustMyCode.forEach(async (testParams) => {
            test('Ensure justMyCode property is correctly derived from global settings', async () => {
                const pythonPath = `PythonPath_${new Date().toString()}`;
                const workspaceFolder = createMoqWorkspaceFolder(__dirname);
                const pythonFile = 'xyz.py';
                setupIoc(pythonPath);
                setupActiveEditor(pythonFile, PYTHON_LANGUAGE);
                getConfigurationStub
                    .withArgs('debugpy', sinon.match.any)
                    .returns(createMoqConfiguration(testParams.justMyCodeSetting));
                const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                    ...launch,
                    justMyCode: testParams.justMyCode,
                });
                expect(debugConfig).to.have.property('justMyCode', testParams.expectedResult);
            });
        });

        const testsForRedirectOutput = [
            {
                console: 'internalConsole',
                redirectOutput: undefined,
                expectedRedirectOutput: true,
            },
            {
                console: 'integratedTerminal',
                redirectOutput: undefined,
                expectedRedirectOutput: undefined,
            },
            {
                console: 'externalTerminal',
                redirectOutput: undefined,
                expectedRedirectOutput: undefined,
            },
            {
                console: 'internalConsole',
                redirectOutput: false,
                expectedRedirectOutput: false,
            },
            {
                console: 'integratedTerminal',
                redirectOutput: false,
                expectedRedirectOutput: false,
            },
            {
                console: 'externalTerminal',
                redirectOutput: false,
                expectedRedirectOutput: false,
            },
            {
                console: 'internalConsole',
                redirectOutput: true,
                expectedRedirectOutput: true,
            },
            {
                console: 'integratedTerminal',
                redirectOutput: true,
                expectedRedirectOutput: true,
            },
            {
                console: 'externalTerminal',
                redirectOutput: true,
                expectedRedirectOutput: true,
            },
        ];
        test('Ensure redirectOutput property is correctly derived from console type', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            const pythonFile = 'xyz.py';
            setupIoc(pythonPath);
            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);
            testsForRedirectOutput.forEach(async (testParams) => {
                const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                    ...launch,
                    console: testParams.console as ConsoleType,
                    redirectOutput: testParams.redirectOutput,
                });
                expect(debugConfig).to.have.property('redirectOutput', testParams.expectedRedirectOutput);
                if (testParams.expectedRedirectOutput) {
                    expect(debugConfig).to.have.property('debugOptions');
                    expect((debugConfig as DebugConfiguration).debugOptions).to.contain(DebugOptions.RedirectOutput);
                }
            });
        });

        test('Test fixFilePathCase', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            const pythonFile = 'xyz.py';
            setupIoc(pythonPath);
            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
            });
            if (osType === platform.OSType.Windows) {
                expect(debugConfig).to.have.property('debugOptions').contains(DebugOptions.FixFilePathCase);
            } else {
                expect(debugConfig).to.have.property('debugOptions').not.contains(DebugOptions.FixFilePathCase);
            }
        });

        test('Jinja added for Pyramid', async () => {
            const workspacePath = path.join('usr', 'development', 'wksp1');
            const pythonPath = path.join(workspacePath, 'env', 'bin', 'python');
            const workspaceFolder = createMoqWorkspaceFolder(workspacePath);
            const pythonFile = 'xyz.py';

            setupIoc(pythonPath);
            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                debugOptions: [DebugOptions.Pyramid],
                pyramid: true,
            });

            expect(debugConfig).to.have.property('debugOptions');
            expect((debugConfig as DebugConfiguration).debugOptions).contains(DebugOptions.Jinja);
        });

        test('Auto detect flask debugging', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            const pythonFile = 'xyz.py';
            setupIoc(pythonPath);
            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                module: 'flask',
            });

            expect(debugConfig).to.have.property('debugOptions');
            expect((debugConfig as DebugConfiguration).debugOptions).contains(DebugOptions.Jinja);
        });

        const testsForautoStartBrowser = [
            {
                autoStartBrowser: true,
                module: 'flask',
            },
            {
                autoStartBrowser: true,
                django: true,
            },
        ];

        test('Add serverReadyAction for Django and Flask', async () => {
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            const pythonFile = 'xyz.py';
            setupIoc(pythonPath);
            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);
            const expectedServerReadyAction = {
                pattern: '.*(https?:\\/\\/\\S+:[0-9]+\\/?).*',
                uriFormat: '%s',
                action: 'openExternally',
            };
            testsForautoStartBrowser.forEach(async (testParams) => {
                const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                    ...launch,
                    ...testParams,
                });
                expect(debugConfig).to.have.property('serverReadyAction', expectedServerReadyAction);
            });
        });

        test('Send consoleName value to debugpy as consoleTitle', async () => {
            const consoleName = 'My Console Name';
            const pythonPath = `PythonPath_${new Date().toString()}`;
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            const pythonFile = 'xyz.py';
            setupIoc(pythonPath);
            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...launch,
                ...{ consoleName },
            });
            expect(debugConfig).to.have.property('consoleTitle', consoleName);
        });

        async function testSetting(
            requestType: 'launch' | 'attach',
            settings: Record<string, boolean>,
            debugOptionName: DebugOptions,
            mustHaveDebugOption: boolean,
        ) {
            setupIoc('pythonPath');
            let debugConfig: DebugConfiguration = {
                request: requestType,
                type: 'python',
                name: '',
                justMyCode: false,
                ...settings,
            };
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);

            debugConfig = (await debugProvider.resolveDebugConfiguration!(workspaceFolder, debugConfig))!;
            debugConfig = (await debugProvider.resolveDebugConfigurationWithSubstitutedVariables!(
                workspaceFolder,
                debugConfig,
            ))!;

            if (mustHaveDebugOption) {
                expect(debugConfig.debugOptions).contains(debugOptionName);
            } else {
                expect(debugConfig.debugOptions).not.contains(debugOptionName);
            }
        }
        type LaunchOrAttach = 'launch' | 'attach';
        const items: LaunchOrAttach[] = ['launch', 'attach'];
        items.forEach((requestType) => {
            test(`Must not contain Sub Process when not specified(${requestType})`, async () => {
                await testSetting(requestType, {}, DebugOptions.SubProcess, false);
            });
            test(`Must not contain Sub Process setting = false(${requestType})`, async () => {
                await testSetting(requestType, { subProcess: false }, DebugOptions.SubProcess, false);
            });
            test(`Must not contain Sub Process setting = true(${requestType})`, async () => {
                await testSetting(requestType, { subProcess: true }, DebugOptions.SubProcess, true);
            });
        });
    });
});
