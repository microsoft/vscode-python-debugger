// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { IExtensionSingleActivationService } from '../activation/types';
import { IPersistentStateFactory } from './types';
import { DebugSessionTelemetry } from './application/debugSessionTelemetry';
import { PersistentStateFactory } from './persistentState';
import { IMultiStepInputFactory, MultiStepInputFactory } from './multiStepInput';
import { IServiceManager } from '../debugger/ioc/types';
import { IProcessLogger } from './process/types';
import { ProcessLogger } from './process/logger';

export function registerTypes(serviceManager: IServiceManager): void {
    serviceManager.addSingleton<IPersistentStateFactory>(IPersistentStateFactory, PersistentStateFactory);
    serviceManager.addBinding(IPersistentStateFactory, IExtensionSingleActivationService);
    serviceManager.addSingleton<IMultiStepInputFactory>(IMultiStepInputFactory, MultiStepInputFactory);
    serviceManager.addSingleton<IExtensionSingleActivationService>(
        IExtensionSingleActivationService,
        DebugSessionTelemetry,
    );
    serviceManager.addSingleton<IProcessLogger>(IProcessLogger, ProcessLogger);
}
