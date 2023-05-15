// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { QuickPickItem } from 'vscode';

export type ProcessListCommand = { command: string; args: string[] };

export interface IAttachItem extends QuickPickItem {
    id: string;
    processName: string;
    commandLine: string;
}

export interface IAttachProcessProvider {
    getAttachItems(): Promise<IAttachItem[]>;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
// export const IAttachProcessProviderFactory = Symbol('IAttachProcessProviderFactory');
// export interface IAttachProcessProviderFactory {
//     registerCommands(): void;
// }

export interface IAttachPicker {
    showQuickPick(): Promise<string>;
}
