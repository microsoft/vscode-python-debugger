// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { IExtensionSingleActivationService } from '../activation/types';
import {
    // IExperimentService,
    // IExtensions,
    // IInstaller,
    IPersistentStateFactory,
    // IRandom,
} from './types';
// import { ApplicationEnvironment } from './application/applicationEnvironment';
// import { ReloadVSCodeCommandHandler } from './application/commands/reloadCommand';
import { DebugSessionTelemetry } from './application/debugSessionTelemetry';
// import { Extensions } from './application/extensions';
// import {IApplicationEnvironment } from './application/types';
// import { ExperimentService } from './experiments/service';
// import { ProductInstaller } from './installer/productInstaller';
import { PersistentStateFactory } from './persistentState';

import { IMultiStepInputFactory, MultiStepInputFactory } from './multiStepInput';
import { IServiceManager } from '../debugger/ioc/types';
import { IProcessLogger } from './process/types';
import { ProcessLogger } from './process/logger';

export function registerTypes(serviceManager: IServiceManager): void {

    // serviceManager.addSingleton<IExtensions>(IExtensions, Extensions);
    // serviceManager.addSingleton<IRandom>(IRandom, Random);
    serviceManager.addSingleton<IPersistentStateFactory>(IPersistentStateFactory, PersistentStateFactory);
    serviceManager.addBinding(IPersistentStateFactory, IExtensionSingleActivationService);
    // serviceManager.addSingleton<IInstaller>(IInstaller, ProductInstaller);
    // serviceManager.addSingleton<IApplicationEnvironment>(IApplicationEnvironment, ApplicationEnvironment);
    // serviceManager.addSingleton<IExperimentService>(IExperimentService, ExperimentService);

    serviceManager.addSingleton<IMultiStepInputFactory>(IMultiStepInputFactory, MultiStepInputFactory);

    // serviceManager.addSingleton<IExtensionSingleActivationService>(
    //     IExtensionSingleActivationService,
    //     ReloadVSCodeCommandHandler,
    // );

    serviceManager.addSingleton<IExtensionSingleActivationService>(
        IExtensionSingleActivationService,
        DebugSessionTelemetry,
    );
    serviceManager.addSingleton<IProcessLogger>(IProcessLogger, ProcessLogger);
}
