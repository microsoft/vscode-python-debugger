// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { l10n } from 'vscode';
import type { IProcessInfo } from '@vscode/windows-process-tree';
import { getOSType, OSType } from '../../common/platform';
import { PsProcessParser } from './psProcessParser';
import { IAttachItem, IAttachProcessProvider, ProcessListCommand } from './types';
import { WmicProcessParser } from './wmicProcessParser';
import { getEnvironmentVariables } from '../../common/python';
import { plainExec } from '../../common/process/rawProcessApis';
import { logProcess } from '../../common/process/logger';

export class AttachProcessProvider implements IAttachProcessProvider {
    constructor() {}

    public getAttachItems(): Promise<IAttachItem[]> {
        return this._getInternalProcessEntries().then((processEntries) => {
            processEntries.sort(
                (
                    { processName: aprocessName, commandLine: aCommandLine },
                    { processName: bProcessName, commandLine: bCommandLine },
                ) => {
                    const compare = (aString: string, bString: string): number => {
                        // localeCompare is significantly slower than < and > (2000 ms vs 80 ms for 10,000 elements)
                        // We can change to localeCompare if this becomes an issue
                        const aLower = aString.toLowerCase();
                        const bLower = bString.toLowerCase();

                        if (aLower === bLower) {
                            return 0;
                        }

                        return aLower < bLower ? -1 : 1;
                    };

                    const aPython = aprocessName.startsWith('python');
                    const bPython = bProcessName.startsWith('python');

                    if (aPython || bPython) {
                        if (aPython && !bPython) {
                            return -1;
                        }
                        if (bPython && !aPython) {
                            return 1;
                        }

                        return aPython ? compare(aCommandLine!, bCommandLine!) : compare(bCommandLine!, aCommandLine!);
                    }

                    return compare(aprocessName, bProcessName);
                },
            );

            return processEntries;
        });
    }

    public async _getInternalProcessEntries(): Promise<IAttachItem[]> {
        const osType = getOSType();

        if (osType === OSType.Windows) {
            try {
                const wpc = require('@vscode/windows-process-tree');
                const processList = await new Promise<IProcessInfo[]>((resolve) => {
                    wpc.getAllProcesses((processes: IProcessInfo[]) => resolve(processes), wpc.ProcessDataFlag.CommandLine);
                });
                return processList.map((p) => ({
                    label: p.name,
                    description: String(p.pid),
                    detail: p.commandLine || '',
                    id: String(p.pid),
                    processName: p.name,
                    commandLine: p.commandLine || '',
                }));
            } catch {
                const customEnvVars = await getEnvironmentVariables();
                const output = await plainExec(
                    WmicProcessParser.wmicCommand.command,
                    WmicProcessParser.wmicCommand.args,
                    { throwOnStdErr: true },
                    customEnvVars,
                );
                logProcess(WmicProcessParser.wmicCommand.command, WmicProcessParser.wmicCommand.args, { throwOnStdErr: true });
                return WmicProcessParser.parseProcesses(output.stdout);
            }
        }

        let processCmd: ProcessListCommand;
        if (osType === OSType.OSX) {
            processCmd = PsProcessParser.psDarwinCommand;
        } else if (osType === OSType.Linux) {
            processCmd = PsProcessParser.psLinuxCommand;
        } else {
            throw new Error(l10n.t("Operating system '{0}' not supported.", osType));
        }

        const customEnvVars = await getEnvironmentVariables();
        const output = await plainExec(processCmd.command, processCmd.args, { throwOnStdErr: true }, customEnvVars);
        logProcess(processCmd.command, processCmd.args, { throwOnStdErr: true });
        return PsProcessParser.parseProcesses(output.stdout);
    }
}
