// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { IServiceManager } from '../../debugger/ioc/types';
import { IApplicationDiagnostics } from '../types';
import { ApplicationDiagnostics } from './applicationDiagnostics';
import {
    InvalidLaunchJsonDebuggerService,
    InvalidLaunchJsonDebuggerServiceId,
} from './checks/invalidLaunchJsonDebugger';
import {
    InvalidPythonPathInDebuggerService,
    InvalidPythonPathInDebuggerServiceId,
} from './checks/invalidPythonPathInDebugger';
import { DiagnosticFilterService } from './filter';
import {
    DiagnosticCommandPromptHandlerService,
    DiagnosticCommandPromptHandlerServiceId,
    MessageCommandPrompt,
} from './promptHandler';
import { IDiagnosticFilterService, IDiagnosticHandlerService, IDiagnosticsService } from './types';

export function registerTypes(serviceManager: IServiceManager): void {
    serviceManager.addSingleton<IDiagnosticFilterService>(IDiagnosticFilterService, DiagnosticFilterService);
    serviceManager.addSingleton<IDiagnosticHandlerService<MessageCommandPrompt>>(
        IDiagnosticHandlerService,
        DiagnosticCommandPromptHandlerService,
        DiagnosticCommandPromptHandlerServiceId,
    );
    serviceManager.addSingleton<IDiagnosticsService>(
        IDiagnosticsService,
        InvalidLaunchJsonDebuggerService,
        InvalidLaunchJsonDebuggerServiceId,
    );
    serviceManager.addSingleton<IDiagnosticsService>(
        IDiagnosticsService,
        InvalidPythonPathInDebuggerService,
        InvalidPythonPathInDebuggerServiceId,
    );
    serviceManager.addSingleton<IApplicationDiagnostics>(IApplicationDiagnostics, ApplicationDiagnostics);
}
