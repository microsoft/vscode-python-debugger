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
        args: [
            '-Command',
            '$processes = if (Get-Command Get-CimInstance -ErrorAction SilentlyContinue) { Get-CimInstance Win32_Process } else { Get-WmiObject Win32_Process }; \
             $processes | % { @{ name = $_.Name; commandLine = $_.CommandLine; processId = $_.ProcessId } } | ConvertTo-Json',
        ], // Get-WmiObject For the legacy compatibility
    };

    export function parseProcesses(processes: string): IAttachItem[] {
        const processesArray = JSON.parse(processes);
        const processEntries: IAttachItem[] = [];
        for (const process of processesArray) {
            if (!process.processId) {
                continue;
            }
            const entry: IAttachItem = {
                label: process.name || '',
                processName: process.name || '',
                description: String(process.processId),
                id: String(process.processId),
                detail: '',
                commandLine: '',
            };
            if (process.commandLine) {
                const dosDevicePrefix = '\\??\\'; // DOS device prefix, see https://reverseengineering.stackexchange.com/a/15178
                let commandLine = process.commandLine;
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
