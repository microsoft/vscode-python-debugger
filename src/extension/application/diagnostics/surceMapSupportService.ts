// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { ConfigurationTarget } from 'vscode';
import { Commands } from '../../common/constants';
import { updateSetting } from '../../common/settings';
import { IDisposableRegistry } from '../../common/types';
import { Diagnostics } from '../../common/utils/localize';
import { executeCommand, registerCommand, showWarningMessage } from '../../common/vscodeapi';
import { ISourceMapSupportService } from './types';

@injectable()
export class SourceMapSupportService implements ISourceMapSupportService {
    constructor(@inject(IDisposableRegistry) private readonly disposables: IDisposableRegistry) {}
    public register(): void {
        this.disposables.push(registerCommand(Commands.Enable_SourceMap_Support, this.onEnable, this));
    }
    public async enable(): Promise<void> {
        await updateSetting(
            'python-debugger',
            'diagnostics.sourceMapsEnabled',
            true,
            undefined,
            ConfigurationTarget.Global,
        );
        await executeCommand('workbench.action.reloadWindow');
    }
    protected async onEnable(): Promise<void> {
        const enableSourceMapsAndReloadVSC = Diagnostics.enableSourceMapsAndReloadVSC;
        const selection = await showWarningMessage(
            Diagnostics.warnBeforeEnablingSourceMaps,
            enableSourceMapsAndReloadVSC,
        );
        if (selection === enableSourceMapsAndReloadVSC) {
            await this.enable();
        }
    }
}
