// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { QuickInputButton, ThemeIcon, Uri, window } from 'vscode';
import { OSType, getOSType } from '../../../../common/platform';
import { DebugConfigStrings } from '../../../../common/utils/localize';

export const goToFileButton: QuickInputButton = {
    iconPath: new ThemeIcon('go-to-file'),
    tooltip: `Open in Preview`,
};

export const browseFileOption = {
    label: `$(folder) ${DebugConfigStrings.browsePath.label}`,
    description: DebugConfigStrings.browsePath.detail,
};

export async function openFileExplorer(folder: Uri | undefined) {
    const filtersKey = 'Python Files';
    const filtersObject: { [name: string]: string[] } = {};
    filtersObject[filtersKey] = ['py'];
    return await window.showOpenDialog({
        filters: getOSType() === OSType.Windows ? filtersObject : undefined,
        openLabel: DebugConfigStrings.browsePath.openButtonLabel,
        canSelectMany: false,
        title: DebugConfigStrings.browsePath.title,
        defaultUri: folder ? folder : undefined,
    });
}
