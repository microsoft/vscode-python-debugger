// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { IServiceManager } from '../debugger/ioc/types';
import { ExtensionActivationManager } from './activationManager';
import {
    IExtensionActivationManager,
    // IExtensionActivationService,
    // IExtensionSingleActivationService,
} from './types';

export function registerTypes(serviceManager: IServiceManager): void {
    // serviceManager.addSingleton<IExtensionActivationService>(IExtensionActivationService, PartialModeStatusItem);
    serviceManager.add<IExtensionActivationManager>(IExtensionActivationManager, ExtensionActivationManager);
    // serviceManager.addSingleton<IExtensionSingleActivationService>(
    //     IExtensionSingleActivationService,
    //     ExtensionSurveyPrompt,
    // );
    // serviceManager.addSingleton<IExtensionSingleActivationService>(
    //     IExtensionSingleActivationService,
    //     LoadLanguageServerExtension,
    // );
}
