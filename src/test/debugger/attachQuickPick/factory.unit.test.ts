// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as assert from 'assert';
import { anything, instance, mock, verify } from 'ts-mockito';
import { Disposable } from 'vscode';
import { ApplicationShell } from '../../../extension/common/application/applicationShell';
import { CommandManager } from '../../../extension/common/application/commandManager';
import { Commands } from '../../../extension/common/constants';
import { PlatformService } from '../../../extension/common/platform/platformService';
import { IPlatformService } from '../../../extension/common/platform/types';
import { ProcessServiceFactory } from '../../../extension/common/process/processFactory';
import { IProcessServiceFactory } from '../../../extension/common/process/types';
import { IDisposableRegistry } from '../../../extension/common/types';
import { AttachProcessProviderFactory } from '../../../extension/debugger/extension/attachQuickPick/factory';

suite('Attach to process - attach process provider factory', () => {
    let applicationShell: IApplicationShell;
    let commandManager: ICommandManager;
    let platformService: IPlatformService;
    let processServiceFactory: IProcessServiceFactory;
    let disposableRegistry: IDisposableRegistry;

    let factory: AttachProcessProviderFactory;

    setup(() => {
        applicationShell = mock(ApplicationShell);
        commandManager = mock(CommandManager);
        platformService = mock(PlatformService);
        processServiceFactory = mock(ProcessServiceFactory);
        disposableRegistry = [];

        factory = new AttachProcessProviderFactory(
            instance(applicationShell),
            instance(commandManager),
            instance(platformService),
            instance(processServiceFactory),
            disposableRegistry,
        );
    });

    test('Register commands should not fail', () => {
        factory.registerCommands();

        verify(commandManager.registerCommand(Commands.PickLocalProcess, anything(), anything())).once();
        assert.strictEqual((disposableRegistry as Disposable[]).length, 1);
    });
});
