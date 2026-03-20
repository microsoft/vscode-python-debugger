// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { l10n } from 'vscode';
import { getOSType, OSType } from '../../common/platform';
import { PsProcessParser } from './psProcessParser';
import { IAttachItem, IAttachProcessProvider, ProcessListCommand } from './types';
import { PowerShellProcessParser } from './powerShellProcessParser';
import { getEnvironmentVariables } from '../../common/python';
import { plainExec } from '../../common/process/rawProcessApis';
import { logProcess } from '../../common/process/logger';
import { WmicProcessParser } from './wmicProcessParser';
import { promisify } from 'util';
import * as wpc from '@vscode/windows-process-tree';
import { ProcessDataFlag } from '@vscode/windows-process-tree';

export class AttachProcessProvider implements IAttachProcessProvider {
    constructor() {}

    public getAttachItems(specCommand?: ProcessListCommand): Promise<IAttachItem[]> {
        return this._getInternalProcessEntries(specCommand).then((processEntries) => {
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

    /**
     * Get processes via wmic (fallback)
     */
    private async _getProcessesViaWmic(): Promise<IAttachItem[]> {
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

    /**
     * Get processes via Ps parser (Linux/macOS)
     */
    private async _getProcessesViaPsParser(cmd: ProcessListCommand): Promise<IAttachItem[]> {
        const customEnvVars = await getEnvironmentVariables();
        const output = await plainExec(cmd.command, cmd.args, { throwOnStdErr: true }, customEnvVars);
        logProcess(cmd.command, cmd.args, { throwOnStdErr: true });
        return PsProcessParser.parseProcesses(output.stdout);
    }

    public async _getInternalProcessEntries(specCommand?: ProcessListCommand): Promise<IAttachItem[]> {
        if (specCommand === undefined) {
            const osType = getOSType();
            if (osType === OSType.OSX) {
                return this._getProcessesViaPsParser(PsProcessParser.psDarwinCommand);
            } else if (osType === OSType.Linux) {
                return this._getProcessesViaPsParser(PsProcessParser.psLinuxCommand);
            } else if (osType === OSType.Windows) {
                try {
                    const getAllProcesses = promisify(wpc.getAllProcesses) as (flags?: ProcessDataFlag) => Promise<wpc.IProcessInfo[]>;
                    const processList = await getAllProcesses(ProcessDataFlag.CommandLine);

                    return processList.map((p) => ({
                        label: p.name,
                        description: String(p.pid),
                        detail: p.commandLine || '',
                        id: String(p.pid),
                        processName: p.name,
                        commandLine: p.commandLine || '',
                    }));
                } catch (error) {
                    console.error('Failed to get processes via windows-process-tree:', error);
                    // 降级到 wmic
                    return this._getProcessesViaWmic();
                }
            } else {
                throw new Error(l10n.t("Operating system '{0}' not supported.", osType));
            }
        }

        const processCmd = specCommand;
        const customEnvVars = await getEnvironmentVariables();
        const output = await plainExec(processCmd.command, processCmd.args, { throwOnStdErr: true }, customEnvVars);
        logProcess(processCmd.command, processCmd.args, { throwOnStdErr: true });
        if (processCmd === WmicProcessParser.wmicCommand) {
            return WmicProcessParser.parseProcesses(output.stdout);
        } else if (
            processCmd === PowerShellProcessParser.powerShellCommand ||
            processCmd === PowerShellProcessParser.powerShellWithoutCimCommand
        ) {
            return PowerShellProcessParser.parseProcesses(output.stdout);
        }
        return PsProcessParser.parseProcesses(output.stdout);
    }
}
