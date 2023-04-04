// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { IServiceManager } from '../../debugger/ioc/types';
import { EnvironmentVariablesService } from './environment';

import { IEnvironmentVariablesService } from './types';

export function registerTypes(serviceManager: IServiceManager) {
    serviceManager.addSingleton<IEnvironmentVariablesService>(
        IEnvironmentVariablesService,
        EnvironmentVariablesService,
    );
}
