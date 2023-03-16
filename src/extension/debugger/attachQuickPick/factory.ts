// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { Commands } from '../../common/constants';
import { IProcessServiceFactory } from '../../common/process/types';
import { IDisposableRegistry } from '../../common/types';
import { registerCommand } from '../../common/vscodeapi';
import { AttachPicker } from './picker';
import { AttachProcessProvider } from './provider';
import { IAttachProcessProviderFactory } from './types';

@injectable()
export class AttachProcessProviderFactory implements IAttachProcessProviderFactory {
    constructor(
        @inject(IProcessServiceFactory) private readonly processServiceFactory: IProcessServiceFactory,
        @inject(IDisposableRegistry) private readonly disposableRegistry: IDisposableRegistry,
    ) {}

    public registerCommands() {
        const provider = new AttachProcessProvider(this.processServiceFactory);
        const picker = new AttachPicker(provider);
        const disposable = registerCommand(
            Commands.PickLocalProcess,
            () => picker.showQuickPick(),
            this,
        );
        this.disposableRegistry.push(disposable);
    }
}
