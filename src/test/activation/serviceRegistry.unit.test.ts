// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { instance, mock, verify } from 'ts-mockito';

import { ExtensionActivationManager } from '../../extension/activation/activationManager';
// import { ExtensionSurveyPrompt } from '../extension/activation/extensionSurvey';
// import { LanguageServerOutputChannel } from '../extension/activation/common/outputChannel';
import { registerTypes } from '../../extension/activation/serviceRegistry';
import {
    IExtensionActivationManager,
    // IExtensionSingleActivationService,
} from '../../extension/activation/types';
import { ServiceManager } from '../../extension/debugger/ioc/serviceManager';
import { IServiceManager } from '../../extension/debugger/ioc/types';
// import { ServiceManager } from '../extension/ioc/serviceManager';
// import { LoadLanguageServerExtension } from '../extension/activation/common/loadLanguageServerExtension';

suite('Unit Tests - Language Server Activation Service Registry', () => {
    let serviceManager: IServiceManager;

    setup(() => {
        serviceManager = mock(ServiceManager);
    });

    test('Ensure common services are registered', async () => {
        registerTypes(instance(serviceManager));

        verify(
            serviceManager.add<IExtensionActivationManager>(IExtensionActivationManager, ExtensionActivationManager),
        ).once();
        // verify(
        //     serviceManager.addSingleton<ILanguageServerOutputChannel>(
        //         ILanguageServerOutputChannel,
        //         LanguageServerOutputChannel,
        //     ),
        // ).once();
        // verify(
        //     serviceManager.addSingleton<IExtensionSingleActivationService>(
        //         IExtensionSingleActivationService,
        //         ExtensionSurveyPrompt,
        //     ),
        // ).once();
        // verify(
        //     serviceManager.addSingleton<IExtensionSingleActivationService>(
        //         IExtensionSingleActivationService,
        //         LoadLanguageServerExtension,
        //     ),
        // ).once();
    });
});
