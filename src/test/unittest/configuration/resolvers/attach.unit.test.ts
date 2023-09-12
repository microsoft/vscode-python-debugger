// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as TypeMoq from 'typemoq';
import * as sinon from 'sinon';
import { DebugConfiguration, DebugConfigurationProvider, TextDocument, TextEditor, Uri, WorkspaceFolder } from 'vscode';
import { PYTHON_LANGUAGE } from '../../../../extension/common/constants';
import { getInfoPerOS } from './common';
import { AttachRequestArguments, DebugOptions } from '../../../../extension/types';
import { AttachConfigurationResolver } from '../../../../extension/debugger/configuration/resolvers/attach';
import * as vscodeapi from '../../../../extension/common/vscodeapi';
import * as platform from '../../../../extension/common/platform';

getInfoPerOS().forEach(([osName, osType, path]) => {
    if (osType === platform.OSType.Unknown) {
        return;
    }

    function getAvailableOptions(): string[] {
        const options = [DebugOptions.RedirectOutput];
        if (osType === platform.OSType.Windows) {
            options.push(DebugOptions.FixFilePathCase);
        }
        options.push(DebugOptions.ShowReturnValue);

        return options;
    }

    suite(`Debugging - Config Resolver attach, OS = ${osName}`, () => {
        let debugProvider: DebugConfigurationProvider;
        let getActiveTextEditorStub: sinon.SinonStub;
        let getWorkspaceFoldersStub: sinon.SinonStub;
        let getOSTypeStub: sinon.SinonStub;
        const debugOptionsAvailable = getAvailableOptions();

        setup(() => {
            debugProvider = new AttachConfigurationResolver();
            getActiveTextEditorStub = sinon.stub(vscodeapi, 'getActiveTextEditor');
            getOSTypeStub = sinon.stub(platform, 'getOSType');
            getWorkspaceFoldersStub = sinon.stub(vscodeapi, 'getWorkspaceFolders');
            getOSTypeStub.returns(osType);
        });

        teardown(() => {
            sinon.restore();
        });

        function createMoqWorkspaceFolder(folderPath: string) {
            const folder = TypeMoq.Mock.ofType<WorkspaceFolder>();
            folder.setup((f) => f.uri).returns(() => Uri.file(folderPath));
            return folder.object;
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

        function getClientOS() {
            return osType === platform.OSType.Windows ? 'windows' : 'unix';
        }

        function setupWorkspaces(folders: string[]) {
            const workspaceFolders = folders.map(createMoqWorkspaceFolder);
            getWorkspaceFoldersStub.returns(workspaceFolders);
        }

        const attach: Partial<AttachRequestArguments> = {
            name: 'Python attach',
            type: 'python-debugger',
            request: 'attach',
        };

        async function resolveDebugConfiguration(
            workspaceFolder: WorkspaceFolder | undefined,
            attachConfig: Partial<AttachRequestArguments>,
        ) {
            let config = await debugProvider.resolveDebugConfiguration!(
                workspaceFolder,
                attachConfig as DebugConfiguration,
            );
            if (config === undefined || config === null) {
                return config;
            }

            config = await debugProvider.resolveDebugConfigurationWithSubstitutedVariables!(workspaceFolder, config);
            if (config === undefined || config === null) {
                return config;
            }

            return config as AttachRequestArguments;
        }

        test('Defaults should be returned when an empty object is passed with a Workspace Folder and active file', async () => {
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            const pythonFile = 'xyz.py';

            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);

            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                request: 'attach',
            });

            expect(Object.keys(debugConfig!)).to.have.lengthOf.above(3);
            expect(debugConfig).to.have.property('request', 'attach');
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.have.property('debugOptions').deep.equal(debugOptionsAvailable);
        });

        test('Defaults should be returned when an empty object is passed without Workspace Folder, no workspaces and active file', async () => {
            const pythonFile = 'xyz.py';

            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);
            setupWorkspaces([]);

            const debugConfig = await resolveDebugConfiguration(undefined, {
                request: 'attach',
            });

            expect(Object.keys(debugConfig!)).to.have.lengthOf.least(3);
            expect(debugConfig).to.have.property('request', 'attach');
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.have.property('debugOptions').deep.equal(debugOptionsAvailable);
            expect(debugConfig).to.have.property('host', 'localhost');
        });

        test('Defaults should be returned when an empty object is passed without Workspace Folder, no workspaces and no active file', async () => {
            setupActiveEditor(undefined, PYTHON_LANGUAGE);
            setupWorkspaces([]);

            const debugConfig = await resolveDebugConfiguration(undefined, {
                request: 'attach',
            });

            expect(Object.keys(debugConfig!)).to.have.lengthOf.least(3);
            expect(debugConfig).to.have.property('request', 'attach');
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.have.property('debugOptions').deep.equal(debugOptionsAvailable);
            expect(debugConfig).to.have.property('host', 'localhost');
        });

        test('Defaults should be returned when an empty object is passed without Workspace Folder, no workspaces and non python file', async () => {
            const activeFile = 'xyz.js';

            setupActiveEditor(activeFile, 'javascript');
            setupWorkspaces([]);

            const debugConfig = await resolveDebugConfiguration(undefined, {
                request: 'attach',
            });

            expect(Object.keys(debugConfig!)).to.have.lengthOf.least(3);
            expect(debugConfig).to.have.property('request', 'attach');
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.have.property('debugOptions').deep.equal(debugOptionsAvailable);
            expect(debugConfig).to.not.have.property('localRoot');
            expect(debugConfig).to.have.property('host', 'localhost');
        });

        test('Defaults should be returned when an empty object is passed without Workspace Folder, with a workspace and an active python file', async () => {
            const activeFile = 'xyz.py';
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const debugConfig = await resolveDebugConfiguration(undefined, {
                request: 'attach',
            });

            expect(Object.keys(debugConfig!)).to.have.lengthOf.least(3);
            expect(debugConfig).to.have.property('request', 'attach');
            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.have.property('debugOptions').deep.equal(debugOptionsAvailable);
            expect(debugConfig).to.have.property('host', 'localhost');
        });

        test('Default host should not be added if connect is available.', async () => {
            const pythonFile = 'xyz.py';

            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);
            setupWorkspaces([]);

            const debugConfig = await resolveDebugConfiguration(undefined, {
                ...attach,
                connect: { host: 'localhost', port: 5678 },
            });

            expect(debugConfig).to.not.have.property('host', 'localhost');
        });

        test('Default host should not be added if listen is available.', async () => {
            const pythonFile = 'xyz.py';

            setupActiveEditor(pythonFile, PYTHON_LANGUAGE);
            setupWorkspaces([]);

            const debugConfig = await resolveDebugConfiguration(undefined, {
                ...attach,
                listen: { host: 'localhost', port: 5678 },
            } as AttachRequestArguments);

            expect(debugConfig).to.not.have.property('host', 'localhost');
        });

        test("Ensure 'localRoot' is left unaltered", async () => {
            const activeFile = 'xyz.py';
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const localRoot = `Debug_PythonPath_${new Date().toString()}`;
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...attach,
                localRoot,
            });

            expect(debugConfig).to.have.property('localRoot', localRoot);
        });

        ['localhost', 'LOCALHOST', '127.0.0.1', '::1'].forEach((host) => {
            test(`Ensure path mappings are automatically added when host is '${host}'`, async () => {
                const activeFile = 'xyz.py';
                const workspaceFolder = createMoqWorkspaceFolder(__dirname);
                setupActiveEditor(activeFile, PYTHON_LANGUAGE);
                const defaultWorkspace = path.join('usr', 'desktop');
                setupWorkspaces([defaultWorkspace]);

                const localRoot = `Debug_PythonPath_${new Date().toString()}`;
                const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                    ...attach,
                    localRoot,
                    host,
                });

                expect(debugConfig).to.have.property('localRoot', localRoot);
                const { pathMappings } = debugConfig as AttachRequestArguments;
                expect(pathMappings).to.be.lengthOf(1);
                expect(pathMappings![0].localRoot).to.be.equal(workspaceFolder.uri.fsPath);
                expect(pathMappings![0].remoteRoot).to.be.equal(workspaceFolder.uri.fsPath);
            });

            test(`Ensure drive letter is lower cased for local path mappings on Windows when host is '${host}'`, async function () {
                if (platform.getOSType() !== platform.OSType.Windows || osType !== platform.OSType.Windows) {
                    return this.skip();
                }
                const activeFile = 'xyz.py';
                const workspaceFolder = createMoqWorkspaceFolder(path.join('C:', 'Debug', 'Python_Path'));
                setupActiveEditor(activeFile, PYTHON_LANGUAGE);
                const defaultWorkspace = path.join('usr', 'desktop');
                setupWorkspaces([defaultWorkspace]);

                const localRoot = `Debug_PythonPath_${new Date().toString()}`;
                const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                    ...attach,
                    localRoot,
                    host,
                });
                const { pathMappings } = debugConfig as AttachRequestArguments;

                const expected = Uri.file(path.join('c:', 'Debug', 'Python_Path')).fsPath;
                expect(pathMappings![0].localRoot).to.be.equal(expected);
                expect(pathMappings![0].remoteRoot).to.be.equal(workspaceFolder.uri.fsPath);

                return undefined;
            });

            test(`Ensure drive letter is not lower cased for local path mappings on non-Windows when host is '${host}'`, async function () {
                if (platform.getOSType() === platform.OSType.Windows || osType === platform.OSType.Windows) {
                    return this.skip();
                }
                const activeFile = 'xyz.py';
                const workspaceFolder = createMoqWorkspaceFolder(path.join('USR', 'Debug', 'Python_Path'));
                setupActiveEditor(activeFile, PYTHON_LANGUAGE);
                const defaultWorkspace = path.join('usr', 'desktop');
                setupWorkspaces([defaultWorkspace]);

                const localRoot = `Debug_PythonPath_${new Date().toString()}`;
                const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                    ...attach,
                    localRoot,
                    host,
                });
                const { pathMappings } = debugConfig as AttachRequestArguments;

                const expected = Uri.file(path.join('USR', 'Debug', 'Python_Path')).fsPath;
                expect(pathMappings![0].localRoot).to.be.equal(expected);
                expect(pathMappings![0].remoteRoot).to.be.equal(workspaceFolder.uri.fsPath);

                return undefined;
            });

            test(`Ensure drive letter is lower cased for local path mappings on Windows when host is '${host}' and with existing path mappings`, async function () {
                if (platform.getOSType() !== platform.OSType.Windows || osType !== platform.OSType.Windows) {
                    return this.skip();
                }
                const activeFile = 'xyz.py';
                const workspaceFolder = createMoqWorkspaceFolder(path.join('C:', 'Debug', 'Python_Path'));
                setupActiveEditor(activeFile, PYTHON_LANGUAGE);
                const defaultWorkspace = path.join('usr', 'desktop');
                setupWorkspaces([defaultWorkspace]);

                const localRoot = `Debug_PythonPath_${new Date().toString()}`;
                const debugPathMappings = [
                    { localRoot: path.join('${workspaceFolder}', localRoot), remoteRoot: '/app/' },
                ];
                const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                    ...attach,
                    localRoot,
                    pathMappings: debugPathMappings,
                    host,
                });
                const { pathMappings } = debugConfig as AttachRequestArguments;

                const expected = Uri.file(path.join('c:', 'Debug', 'Python_Path', localRoot)).fsPath;
                expect(pathMappings![0].localRoot).to.be.equal(expected);
                expect(pathMappings![0].remoteRoot).to.be.equal('/app/');

                return undefined;
            });

            test(`Ensure drive letter is not lower cased for local path mappings on non-Windows when host is '${host}' and with existing path mappings`, async function () {
                if (platform.getOSType() === platform.OSType.Windows || osType === platform.OSType.Windows) {
                    return this.skip();
                }
                const activeFile = 'xyz.py';
                const workspaceFolder = createMoqWorkspaceFolder(path.join('USR', 'Debug', 'Python_Path'));
                setupActiveEditor(activeFile, PYTHON_LANGUAGE);
                const defaultWorkspace = path.join('usr', 'desktop');
                setupWorkspaces([defaultWorkspace]);

                const localRoot = `Debug_PythonPath_${new Date().toString()}`;
                const debugPathMappings = [
                    { localRoot: path.join('${workspaceFolder}', localRoot), remoteRoot: '/app/' },
                ];

                const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                    ...attach,
                    localRoot,
                    pathMappings: debugPathMappings,
                    host,
                });
                const { pathMappings } = debugConfig as AttachRequestArguments;

                const expected = Uri.file(path.join('USR', 'Debug', 'Python_Path', localRoot)).fsPath;
                expect(Uri.file(pathMappings![0].localRoot).fsPath).to.be.equal(expected);
                expect(pathMappings![0].remoteRoot).to.be.equal('/app/');

                return undefined;
            });

            test(`Ensure local path mappings are not modified when not pointing to a local drive when host is '${host}'`, async () => {
                const activeFile = 'xyz.py';
                const workspaceFolder = createMoqWorkspaceFolder(path.join('Server', 'Debug', 'Python_Path'));
                setupActiveEditor(activeFile, PYTHON_LANGUAGE);
                const defaultWorkspace = path.join('usr', 'desktop');
                setupWorkspaces([defaultWorkspace]);

                const localRoot = `Debug_PythonPath_${new Date().toString()}`;
                const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                    ...attach,
                    localRoot,
                    host,
                });
                const { pathMappings } = debugConfig as AttachRequestArguments;

                expect(pathMappings![0].localRoot).to.be.equal(workspaceFolder.uri.fsPath);
                expect(pathMappings![0].remoteRoot).to.be.equal(workspaceFolder.uri.fsPath);
            });
        });

        ['192.168.1.123', 'don.debugger.com'].forEach((host) => {
            test(`Ensure path mappings are not automatically added when host is '${host}'`, async () => {
                const activeFile = 'xyz.py';
                const workspaceFolder = createMoqWorkspaceFolder(__dirname);
                setupActiveEditor(activeFile, PYTHON_LANGUAGE);
                const defaultWorkspace = path.join('usr', 'desktop');
                setupWorkspaces([defaultWorkspace]);

                const localRoot = `Debug_PythonPath_${new Date().toString()}`;
                const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                    ...attach,
                    localRoot,
                    host,
                });

                expect(debugConfig).to.have.property('localRoot', localRoot);
                const { pathMappings } = debugConfig as AttachRequestArguments;
                expect(pathMappings || []).to.be.lengthOf(0);
            });
        });

        test("Ensure 'localRoot' and 'remoteRoot' is used", async () => {
            const activeFile = 'xyz.py';
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const localRoot = `Debug_PythonPath_Local_Root_${new Date().toString()}`;
            const remoteRoot = `Debug_PythonPath_Remote_Root_${new Date().toString()}`;
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...attach,
                localRoot,
                remoteRoot,
            });

            expect(debugConfig!.pathMappings).to.be.lengthOf(1);
            expect(debugConfig!.pathMappings).to.deep.include({ localRoot, remoteRoot });
        });

        test("Ensure 'localRoot' and 'remoteRoot' is used", async () => {
            const activeFile = 'xyz.py';
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const localRoot = `Debug_PythonPath_Local_Root_${new Date().toString()}`;
            const remoteRoot = `Debug_PythonPath_Remote_Root_${new Date().toString()}`;
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...attach,
                localRoot,
                remoteRoot,
            });

            expect(debugConfig!.pathMappings).to.be.lengthOf(1);
            expect(debugConfig!.pathMappings).to.deep.include({ localRoot, remoteRoot });
        });

        test("Ensure 'remoteRoot' is left unaltered", async () => {
            const activeFile = 'xyz.py';
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const remoteRoot = `Debug_PythonPath_${new Date().toString()}`;
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...attach,
                remoteRoot,
            });

            expect(debugConfig).to.have.property('remoteRoot', remoteRoot);
        });

        test("Ensure 'port' is left unaltered", async () => {
            const activeFile = 'xyz.py';
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const port = 12341234;
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...attach,
                port,
            });

            expect(debugConfig).to.have.property('port', port);
        });
        test("Ensure 'debugOptions' are left unaltered", async () => {
            const activeFile = 'xyz.py';
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const debugOptions = debugOptionsAvailable
                .slice()
                .concat(DebugOptions.Jinja, DebugOptions.Sudo) as DebugOptions[];
            const expectedDebugOptions = debugOptions.slice();
            const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                ...attach,
                debugOptions,
            });

            expect(debugConfig).to.have.property('clientOS', getClientOS());
            expect(debugConfig).to.have.property('debugOptions').to.be.deep.equal(expectedDebugOptions);
        });

        const testsForJustMyCode = [
            {
                justMyCode: false,
                debugStdLib: true,
                expectedResult: false,
            },
            {
                justMyCode: false,
                debugStdLib: false,
                expectedResult: false,
            },
            {
                justMyCode: false,
                debugStdLib: undefined,
                expectedResult: false,
            },
            {
                justMyCode: true,
                debugStdLib: false,
                expectedResult: true,
            },
            {
                justMyCode: true,
                debugStdLib: true,
                expectedResult: true,
            },
            {
                justMyCode: true,
                debugStdLib: undefined,
                expectedResult: true,
            },
            {
                justMyCode: undefined,
                debugStdLib: false,
                expectedResult: true,
            },
            {
                justMyCode: undefined,
                debugStdLib: true,
                expectedResult: false,
            },
            {
                justMyCode: undefined,
                debugStdLib: undefined,
                expectedResult: true,
            },
        ];
        test('Ensure justMyCode property is correctly derived from debugStdLib', async () => {
            const activeFile = 'xyz.py';
            const workspaceFolder = createMoqWorkspaceFolder(__dirname);
            setupActiveEditor(activeFile, PYTHON_LANGUAGE);
            const defaultWorkspace = path.join('usr', 'desktop');
            setupWorkspaces([defaultWorkspace]);

            const debugOptions = debugOptionsAvailable
                .slice()
                .concat(DebugOptions.Jinja, DebugOptions.Sudo) as DebugOptions[];

            testsForJustMyCode.forEach(async (testParams) => {
                const debugConfig = await resolveDebugConfiguration(workspaceFolder, {
                    ...attach,
                    debugOptions,
                    justMyCode: testParams.justMyCode,
                    debugStdLib: testParams.debugStdLib,
                });
                expect(debugConfig).to.have.property('justMyCode', testParams.expectedResult);
            });
        });
    });
});
