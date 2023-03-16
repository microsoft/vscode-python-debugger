// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { Uri } from 'vscode';
import { getEnvironmentVariables } from '../python';
import { IDisposableRegistry } from '../types';
import { ProcessService } from './proc';
import { IProcessLogger, IProcessService, IProcessServiceFactory } from './types';

@injectable()
export class ProcessServiceFactory implements IProcessServiceFactory {
    constructor(
        @inject(IProcessLogger) private readonly processLogger: IProcessLogger,
        @inject(IDisposableRegistry) private readonly disposableRegistry: IDisposableRegistry,
    ) {}
    public async create(resource?: Uri): Promise<IProcessService> {
        const customEnvVars = await getEnvironmentVariables(resource);
        const proc: IProcessService = new ProcessService(customEnvVars);
        this.disposableRegistry.push(proc);
        return proc.on('exec', this.processLogger.logProcess.bind(this.processLogger));
    }
}
