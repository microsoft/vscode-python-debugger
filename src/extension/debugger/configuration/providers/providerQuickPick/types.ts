// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { QuickPickItem, QuickPickItemKind, Uri } from 'vscode';

export interface PathQuickPickItem extends QuickPickItem {
    filePath: Uri;
    kind?: QuickPickItemKind;
    description: string;
}
export interface SeparatorQuickPickItem extends QuickPickItem {
    label: string;
    kind?: QuickPickItemKind;
}

export type QuickPickType = PathQuickPickItem | SeparatorQuickPickItem;
