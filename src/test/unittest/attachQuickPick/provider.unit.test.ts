// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as assert from 'assert';
import * as sinon from 'sinon';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { AttachProcessProvider } from '../../../extension/debugger/attachQuickPick/provider';
import { PsProcessParser } from '../../../extension/debugger/attachQuickPick/psProcessParser';
import { IAttachItem } from '../../../extension/debugger/attachQuickPick/types';
import { WmicProcessParser } from '../../../extension/debugger/attachQuickPick/wmicProcessParser';
import * as platform from '../../../extension/common/platform';
import * as rawProcessApis from '../../../extension/common/process/rawProcessApis';
import * as wpc from '@vscode/windows-process-tree';

use(chaiAsPromised);

suite('Attach to process - process provider', () => {
    let provider: AttachProcessProvider;
    let getOSTypeStub: sinon.SinonStub;
    let plainExecStub: sinon.SinonStub;
    let getAllProcessesStub: sinon.SinonStub;

    setup(() => {
        provider = new AttachProcessProvider();
        getOSTypeStub = sinon.stub(platform, 'getOSType');
        plainExecStub = sinon.stub(rawProcessApis, 'plainExec');
        getAllProcessesStub = sinon.stub(wpc, 'getAllProcesses');
    });

    teardown(() => {
        sinon.restore();
    });

    test('The Linux process list command should be called if the platform is Linux', async () => {
        getOSTypeStub.returns(platform.OSType.Linux);
        const psOutput = `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
1 launchd                                            launchd
41 syslogd                                            syslogd
146 kextd                                              kextd
`;
        const expectedOutput: IAttachItem[] = [
            {
                label: 'launchd',
                description: '1',
                detail: 'launchd',
                id: '1',
                processName: 'launchd',
                commandLine: 'launchd',
            },
            {
                label: 'syslogd',
                description: '41',
                detail: 'syslogd',
                id: '41',
                processName: 'syslogd',
                commandLine: 'syslogd',
            },
            {
                label: 'kextd',
                description: '146',
                detail: 'kextd',
                id: '146',
                processName: 'kextd',
                commandLine: 'kextd',
            },
        ];
        plainExecStub
            .withArgs(PsProcessParser.psLinuxCommand.command, sinon.match.any, sinon.match.any, sinon.match.any)
            .resolves({ stdout: psOutput });

        const attachItems = await provider._getInternalProcessEntries();
        sinon.assert.calledOnceWithExactly(
            plainExecStub,
            PsProcessParser.psLinuxCommand.command,
            PsProcessParser.psLinuxCommand.args,
            sinon.match.any,
            sinon.match.any,
        );
        assert.deepEqual(attachItems, expectedOutput);
    });

    test('The macOS process list command should be called if the platform is macOS', async () => {
        getOSTypeStub.returns(platform.OSType.OSX);
        const psOutput = `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
1 launchd                                            launchd
41 syslogd                                            syslogd
146 kextd                                              kextd
`;
        const expectedOutput: IAttachItem[] = [
            {
                label: 'launchd',
                description: '1',
                detail: 'launchd',
                id: '1',
                processName: 'launchd',
                commandLine: 'launchd',
            },
            {
                label: 'syslogd',
                description: '41',
                detail: 'syslogd',
                id: '41',
                processName: 'syslogd',
                commandLine: 'syslogd',
            },
            {
                label: 'kextd',
                description: '146',
                detail: 'kextd',
                id: '146',
                processName: 'kextd',
                commandLine: 'kextd',
            },
        ];
        plainExecStub
            .withArgs(PsProcessParser.psDarwinCommand.command, sinon.match.any, sinon.match.any, sinon.match.any)
            .resolves({ stdout: psOutput });

        const attachItems = await provider._getInternalProcessEntries();
        sinon.assert.calledOnceWithExactly(
            plainExecStub,
            PsProcessParser.psDarwinCommand.command,
            PsProcessParser.psDarwinCommand.args,
            sinon.match.any,
            sinon.match.any,
        );

        assert.deepEqual(attachItems, expectedOutput);
    });

    test('The Windows process list should be obtained via getAllProcesses if the platform is Windows', async () => {
        const processList = [
            { pid: 4, ppid: 0, name: 'System', commandLine: '' },
            { pid: 5728, ppid: 1, name: 'sihost.exe', commandLine: 'sihost.exe' },
            {
                pid: 5912,
                ppid: 1,
                name: 'svchost.exe',
                commandLine: 'C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s CDPUserSvc',
            },
        ];
        const expectedOutput: IAttachItem[] = [
            {
                label: 'System',
                description: '4',
                detail: '',
                id: '4',
                processName: 'System',
                commandLine: '',
            },
            {
                label: 'sihost.exe',
                description: '5728',
                detail: 'sihost.exe',
                id: '5728',
                processName: 'sihost.exe',
                commandLine: 'sihost.exe',
            },
            {
                label: 'svchost.exe',
                description: '5912',
                detail: 'C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s CDPUserSvc',
                id: '5912',
                processName: 'svchost.exe',
                commandLine: 'C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s CDPUserSvc',
            },
        ];
        getOSTypeStub.returns(platform.OSType.Windows);
        getAllProcessesStub.callsFake((_flag: any,callback: Function) => callback(null,processList));

        const attachItems = await provider._getInternalProcessEntries();
        sinon.assert.notCalled(plainExecStub);
        assert.deepEqual(attachItems, expectedOutput);
    });

    test('An error should be thrown if the platform is neither Linux, macOS or Windows', async () => {
        getOSTypeStub.returns(platform.OSType.Unknown);
        const promise = provider._getInternalProcessEntries();

        await expect(promise).to.eventually.be.rejectedWith(
            `Operating system '${platform.OSType.Unknown}' not supported.`,
        );
    });

    suite('POSIX getAttachItems (Linux)', () => {
        setup(() => {
            getOSTypeStub.returns(platform.OSType.Linux);
        });

        test('Items returned by getAttachItems should be sorted alphabetically', async () => {
            const psOutput = `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    1 launchd                                            launchd
    41 syslogd                                            syslogd
    146 kextd                                              kextd
`;
            const expectedOutput: IAttachItem[] = [
                {
                    label: 'kextd',
                    description: '146',
                    detail: 'kextd',
                    id: '146',
                    processName: 'kextd',
                    commandLine: 'kextd',
                },
                {
                    label: 'launchd',
                    description: '1',
                    detail: 'launchd',
                    id: '1',
                    processName: 'launchd',
                    commandLine: 'launchd',
                },
                {
                    label: 'syslogd',
                    description: '41',
                    detail: 'syslogd',
                    id: '41',
                    processName: 'syslogd',
                    commandLine: 'syslogd',
                },
            ];
            plainExecStub
                .withArgs(PsProcessParser.psLinuxCommand.command, sinon.match.any, sinon.match.any, sinon.match.any)
                .resolves({ stdout: psOutput });

            const output = await provider.getAttachItems();

            assert.deepEqual(output, expectedOutput);
        });

        test('Python processes should be at the top of the list returned by getAttachItems', async () => {
            const psOutput = `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
     1 launchd                                            launchd
    41 syslogd                                            syslogd
    96 python                                             python
   146 kextd                                              kextd
 31896 python                                             python script.py
`;
            const expectedOutput: IAttachItem[] = [
                {
                    label: 'python',
                    description: '96',
                    detail: 'python',
                    id: '96',
                    processName: 'python',
                    commandLine: 'python',
                },
                {
                    label: 'python',
                    description: '31896',
                    detail: 'python script.py',
                    id: '31896',
                    processName: 'python',
                    commandLine: 'python script.py',
                },
                {
                    label: 'kextd',
                    description: '146',
                    detail: 'kextd',
                    id: '146',
                    processName: 'kextd',
                    commandLine: 'kextd',
                },
                {
                    label: 'launchd',
                    description: '1',
                    detail: 'launchd',
                    id: '1',
                    processName: 'launchd',
                    commandLine: 'launchd',
                },
                {
                    label: 'syslogd',
                    description: '41',
                    detail: 'syslogd',
                    id: '41',
                    processName: 'syslogd',
                    commandLine: 'syslogd',
                },
            ];

            plainExecStub
                .withArgs(PsProcessParser.psLinuxCommand.command, sinon.match.any, sinon.match.any, sinon.match.any)
                .resolves({ stdout: psOutput });

            const output = await provider.getAttachItems();

            assert.deepEqual(output, expectedOutput);
        });
    });

    suite('Windows getAttachItems', () => {
        setup(() => {
            getOSTypeStub.returns(platform.OSType.Windows);
        });

        test('Items returned by getAttachItems should be sorted alphabetically', async () => {
            const processList = [
                { pid: 4, ppid: 0, name: 'System', commandLine: '' },
                { pid: 5372, ppid: 1, name: 'svchost.exe', commandLine: '' },
                { pid: 5728, ppid: 1, name: 'sihost.exe', commandLine: 'sihost.exe' },
            ];
            const expectedOutput: IAttachItem[] = [
                {
                    label: 'sihost.exe',
                    description: '5728',
                    detail: 'sihost.exe',
                    id: '5728',
                    processName: 'sihost.exe',
                    commandLine: 'sihost.exe',
                },
                {
                    label: 'svchost.exe',
                    description: '5372',
                    detail: '',
                    id: '5372',
                    processName: 'svchost.exe',
                    commandLine: '',
                },
                {
                    label: 'System',
                    description: '4',
                    detail: '',
                    id: '4',
                    processName: 'System',
                    commandLine: '',
                },
            ];

            getAllProcessesStub.callsFake((_flag: any,callback: Function) => callback(null,processList));

            const output = await provider.getAttachItems();

            assert.deepEqual(output, expectedOutput);
        });

        test('Python processes should be at the top of the list returned by getAttachItems', async () => {
            const processList = [
                { pid: 4, ppid: 0, name: 'System', commandLine: '' },
                { pid: 5372, ppid: 1, name: 'svchost.exe', commandLine: '' },
                { pid: 5728, ppid: 1, name: 'sihost.exe', commandLine: 'sihost.exe' },
                {
                    pid: 5912,
                    ppid: 1,
                    name: 'svchost.exe',
                    commandLine: 'C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s CDPUserSvc',
                },
                {
                    pid: 6028,
                    ppid: 1,
                    name: 'python.exe',
                    commandLine:
                        'C:\\Users\\Contoso\\AppData\\Local\\Programs\\Python\\Python37\\python.exe c:/Users/Contoso/Documents/hello_world.py',
                },
                {
                    pid: 8026,
                    ppid: 1,
                    name: 'python.exe',
                    commandLine:
                        'C:\\Users\\Contoso\\AppData\\Local\\Programs\\Python\\Python37\\python.exe c:/Users/Contoso/Documents/foo_bar.py',
                },
            ];
            const expectedOutput: IAttachItem[] = [
                {
                    label: 'python.exe',
                    description: '8026',
                    detail: 'C:\\Users\\Contoso\\AppData\\Local\\Programs\\Python\\Python37\\python.exe c:/Users/Contoso/Documents/foo_bar.py',
                    id: '8026',
                    processName: 'python.exe',
                    commandLine:
                        'C:\\Users\\Contoso\\AppData\\Local\\Programs\\Python\\Python37\\python.exe c:/Users/Contoso/Documents/foo_bar.py',
                },
                {
                    label: 'python.exe',
                    description: '6028',
                    detail: 'C:\\Users\\Contoso\\AppData\\Local\\Programs\\Python\\Python37\\python.exe c:/Users/Contoso/Documents/hello_world.py',
                    id: '6028',
                    processName: 'python.exe',
                    commandLine:
                        'C:\\Users\\Contoso\\AppData\\Local\\Programs\\Python\\Python37\\python.exe c:/Users/Contoso/Documents/hello_world.py',
                },
                {
                    label: 'sihost.exe',
                    description: '5728',
                    detail: 'sihost.exe',
                    id: '5728',
                    processName: 'sihost.exe',
                    commandLine: 'sihost.exe',
                },
                {
                    label: 'svchost.exe',
                    description: '5372',
                    detail: '',
                    id: '5372',
                    processName: 'svchost.exe',
                    commandLine: '',
                },
                {
                    label: 'svchost.exe',
                    description: '5912',
                    detail: 'C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s CDPUserSvc',
                    id: '5912',
                    processName: 'svchost.exe',
                    commandLine: 'C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s CDPUserSvc',
                },
                {
                    label: 'System',
                    description: '4',
                    detail: '',
                    id: '4',
                    processName: 'System',
                    commandLine: '',
                },
            ];

            getAllProcessesStub.callsFake((_flag: any,callback: Function) => callback(null,processList));

            const output = await provider.getAttachItems();

            assert.deepEqual(output, expectedOutput);
        });
    });

    suite('Windows getAttachItems - wmic fallback', () => {
        setup(() => {
            getOSTypeStub.returns(platform.OSType.Windows);
        });

        test('Should fall back to wmic when getAllProcesses fails', async () => {
            getAllProcessesStub.callsFake((_flag: any,_callback: Function) => {
                throw new Error('windows-process-tree unavailable');
            });
            const windowsOutput = `CommandLine=\r
Name=System\r
ProcessId=4\r
\r
\r
CommandLine=sihost.exe\r
Name=sihost.exe\r
ProcessId=5728\r
\r
\r
CommandLine=C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s CDPUserSvc\r
Name=svchost.exe\r
ProcessId=5912\r
`;
            const expectedOutput: IAttachItem[] = [
                {
                    label: 'System',
                    description: '4',
                    detail: '',
                    id: '4',
                    processName: 'System',
                    commandLine: '',
                },
                {
                    label: 'sihost.exe',
                    description: '5728',
                    detail: 'sihost.exe',
                    id: '5728',
                    processName: 'sihost.exe',
                    commandLine: 'sihost.exe',
                },
                {
                    label: 'svchost.exe',
                    description: '5912',
                    detail: 'C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s CDPUserSvc',
                    id: '5912',
                    processName: 'svchost.exe',
                    commandLine: 'C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s CDPUserSvc',
                },
            ];

            plainExecStub
                .withArgs(WmicProcessParser.wmicCommand.command, sinon.match.any, sinon.match.any, sinon.match.any)
                .resolves({ stdout: windowsOutput });

            const attachItems = await provider._getInternalProcessEntries();
            sinon.assert.calledOnce(plainExecStub);
            assert.deepEqual(attachItems, expectedOutput);
        });

        test('Items returned by getAttachItems via wmic fallback should be sorted alphabetically', async () => {
            getAllProcessesStub.callsFake((_flag: any,_callback: Function) => {
                throw new Error('windows-process-tree unavailable');
            });
            const windowsOutput = `CommandLine=\r
Name=System\r
ProcessId=4\r
\r
\r
CommandLine=\r
Name=svchost.exe\r
ProcessId=5372\r
\r
\r
CommandLine=sihost.exe\r
Name=sihost.exe\r
ProcessId=5728\r
`;
            const expectedOutput: IAttachItem[] = [
                {
                    label: 'sihost.exe',
                    description: '5728',
                    detail: 'sihost.exe',
                    id: '5728',
                    processName: 'sihost.exe',
                    commandLine: 'sihost.exe',
                },
                {
                    label: 'svchost.exe',
                    description: '5372',
                    detail: '',
                    id: '5372',
                    processName: 'svchost.exe',
                    commandLine: '',
                },
                {
                    label: 'System',
                    description: '4',
                    detail: '',
                    id: '4',
                    processName: 'System',
                    commandLine: '',
                },
            ];

            plainExecStub
                .withArgs(WmicProcessParser.wmicCommand.command, sinon.match.any, sinon.match.any, sinon.match.any)
                .resolves({ stdout: windowsOutput });

            const output = await provider.getAttachItems();

            assert.deepEqual(output, expectedOutput);
        });

        test('Python processes should be at the top of the list returned by getAttachItems via wmic fallback', async () => {
            getAllProcessesStub.callsFake((_flag: any,_callback: Function) => {
                throw new Error('windows-process-tree unavailable');
            });
            const windowsOutput = `CommandLine=\r
Name=System\r
ProcessId=4\r
\r
\r
CommandLine=\r
Name=svchost.exe\r
ProcessId=5372\r
\r
\r
CommandLine=sihost.exe\r
Name=sihost.exe\r
ProcessId=5728\r
\r
\r
CommandLine=C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s CDPUserSvc\r
Name=svchost.exe\r
ProcessId=5912\r
\r
\r
CommandLine=C:\\Users\\Contoso\\AppData\\Local\\Programs\\Python\\Python37\\python.exe c:/Users/Contoso/Documents/hello_world.py\r
Name=python.exe\r
ProcessId=6028\r
\r
\r
CommandLine=C:\\Users\\Contoso\\AppData\\Local\\Programs\\Python\\Python37\\python.exe c:/Users/Contoso/Documents/foo_bar.py\r
Name=python.exe\r
ProcessId=8026\r
            `;
            const expectedOutput: IAttachItem[] = [
                {
                    label: 'python.exe',
                    description: '8026',
                    detail: 'C:\\Users\\Contoso\\AppData\\Local\\Programs\\Python\\Python37\\python.exe c:/Users/Contoso/Documents/foo_bar.py',
                    id: '8026',
                    processName: 'python.exe',
                    commandLine:
                        'C:\\Users\\Contoso\\AppData\\Local\\Programs\\Python\\Python37\\python.exe c:/Users/Contoso/Documents/foo_bar.py',
                },
                {
                    label: 'python.exe',
                    description: '6028',
                    detail: 'C:\\Users\\Contoso\\AppData\\Local\\Programs\\Python\\Python37\\python.exe c:/Users/Contoso/Documents/hello_world.py',
                    id: '6028',
                    processName: 'python.exe',
                    commandLine:
                        'C:\\Users\\Contoso\\AppData\\Local\\Programs\\Python\\Python37\\python.exe c:/Users/Contoso/Documents/hello_world.py',
                },
                {
                    label: 'sihost.exe',
                    description: '5728',
                    detail: 'sihost.exe',
                    id: '5728',
                    processName: 'sihost.exe',
                    commandLine: 'sihost.exe',
                },
                {
                    label: 'svchost.exe',
                    description: '5372',
                    detail: '',
                    id: '5372',
                    processName: 'svchost.exe',
                    commandLine: '',
                },
                {
                    label: 'svchost.exe',
                    description: '5912',
                    detail: 'C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s CDPUserSvc',
                    id: '5912',
                    processName: 'svchost.exe',
                    commandLine: 'C:\\WINDOWS\\system32\\svchost.exe -k UnistackSvcGroup -s CDPUserSvc',
                },
                {
                    label: 'System',
                    description: '4',
                    detail: '',
                    id: '4',
                    processName: 'System',
                    commandLine: '',
                },
            ];

            plainExecStub
                .withArgs(WmicProcessParser.wmicCommand.command, sinon.match.any, sinon.match.any, sinon.match.any)
                .resolves({ stdout: windowsOutput });

            const output = await provider.getAttachItems();

            assert.deepEqual(output, expectedOutput);
        });
    });
});
