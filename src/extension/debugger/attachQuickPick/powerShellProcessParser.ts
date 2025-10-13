// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// due to wmic has been deprecated create this file to replace wmicProcessParser.ts

'use strict';

import { IAttachItem, ProcessListCommand } from './types';

export namespace PowerShellProcessParser {
    
    // Perf numbers on Win10:
    // | # of processes | Time (ms) |
    // |----------------+-----------|
    // |            309 |       413 |
    // |            407 |       463 |
    // |            887 |       746 |
    // |           1308 |      1132 |
    export const powerShellCommand: ProcessListCommand = {
        command: 'powershell',
        args: ['-ExecutionPolicy','ByPass','-File','D:\\vscode-python-debugger\\bundled\\scripts\\noConfigScripts\\processSelect.ps1'],
    };

    export function parseProcesses(processes: string): IAttachItem[] {
        const processesArray = JSON.parse(processes);
        const processEntries: IAttachItem[] = [];
        for (const process of processesArray) {
            if (!process.ProcessId) {
                continue;
            }
            const entry: IAttachItem = {
                label: process.Name || '',
                processName: process.Name || '',
                description: String(process.ProcessId),
                id: String(process.ProcessId),
                detail: '',
                commandLine: '',
            };
            if (process.CommandLine) {
                const dosDevicePrefix = '\\??\\';// DOS device prefix, see https://reverseengineering.stackexchange.com/a/15178
                let commandLine = process.CommandLine;
                if (commandLine.startsWith(dosDevicePrefix)) {
                    commandLine = commandLine.slice(dosDevicePrefix.length);
                }
                entry.detail = commandLine;
                entry.commandLine = commandLine;
            }
            processEntries.push(entry);
        }
        return processEntries;
    }
}
