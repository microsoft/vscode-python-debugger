// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { Disposable, ThemeIcon } from 'vscode';
import { AttachProcess } from '../../common/utils/localize';
import { createQuickPick } from '../../common/vscodeapi';
import { IAttachItem, IAttachPicker, IAttachProcessProvider } from './types';

export class AttachPicker implements IAttachPicker {
    constructor(private readonly attachItemsProvider: IAttachProcessProvider) {}

    public showQuickPick(): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            const processEntries = await this.attachItemsProvider.getAttachItems();

            const refreshButton = {
                iconPath: new ThemeIcon('refresh'),
                tooltip: AttachProcess.refreshList,
            };

            const quickPick = createQuickPick<IAttachItem>();
            quickPick.title = AttachProcess.attachTitle;
            quickPick.placeholder = AttachProcess.selectProcessPlaceholder;
            quickPick.canSelectMany = false;
            quickPick.matchOnDescription = true;
            quickPick.matchOnDetail = true;
            quickPick.items = processEntries;
            quickPick.buttons = [refreshButton];

            const disposables: Disposable[] = [];

            quickPick.onDidTriggerButton(
                async () => {
                    quickPick.busy = true;
                    const attachItems = await this.attachItemsProvider.getAttachItems();
                    quickPick.items = attachItems;
                    quickPick.busy = false;
                },
                this,
                disposables,
            );

            quickPick.onDidAccept(
                () => {
                    if (quickPick.selectedItems.length !== 1) {
                        reject(new Error(AttachProcess.noProcessSelected));
                    }

                    const selectedId = quickPick.selectedItems[0].id;

                    disposables.forEach((item) => item.dispose());
                    quickPick.dispose();

                    resolve(selectedId);
                },
                undefined,
                disposables,
            );

            quickPick.onDidHide(
                () => {
                    disposables.forEach((item) => item.dispose());
                    quickPick.dispose();

                    reject(new Error(AttachProcess.noProcessSelected));
                },
                undefined,
                disposables,
            );

            quickPick.show();
        });
    }
}
