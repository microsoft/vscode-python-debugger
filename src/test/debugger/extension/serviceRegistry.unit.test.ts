// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { instance, mock, verify } from 'ts-mockito';
import { IExtensionSingleActivationService } from '../../../extension/activation/types';
import { DebugAdapterActivator } from '../../../extension/debugger/adapter/activator';
import { DebugAdapterDescriptorFactory } from '../../../extension/debugger/adapter/factory';
import { DebugSessionLoggingFactory } from '../../../extension/debugger/adapter/logging';
import { OutdatedDebuggerPromptFactory } from '../../../extension/debugger/adapter/outdatedDebuggerPrompt';
import { AttachProcessProviderFactory } from '../../../extension/debugger/attachQuickPick/factory';
import { IAttachProcessProviderFactory } from '../../../extension/debugger/attachQuickPick/types';
import { PythonDebugConfigurationService } from '../../../extension/debugger/configuration/debugConfigurationService';
import { LaunchJsonCompletionProvider } from '../../../extension/debugger/configuration/launch.json/completionProvider';
import { InterpreterPathCommand } from '../../../extension/debugger//configuration/launch.json/interpreterPathCommand';
import { LaunchJsonUpdaterService } from '../../../extension/debugger/configuration/launch.json/updaterService';
import { AttachConfigurationResolver } from '../../../extension/debugger/configuration/resolvers/attach';
import { LaunchConfigurationResolver } from '../../../extension/debugger/configuration/resolvers/launch';
import { IDebugConfigurationResolver } from '../../../extension/debugger/configuration/types';
import { DebugCommands } from '../../../extension/debugger/debugCommands';
import { ChildProcessAttachEventHandler } from '../../../extension/debugger/hooks/childProcessAttachHandler';
import { ChildProcessAttachService } from '../../../extension/debugger/hooks/childProcessAttachService';
import { IChildProcessAttachService, IDebugSessionEventHandlers } from '../../../extension/debugger/hooks/types';
import { registerTypes } from '../../../extension/debugger/serviceRegistry';
import {
    IDebugAdapterDescriptorFactory,
    IDebugConfigurationService,
    IDebugSessionLoggingFactory,
    IOutdatedDebuggerPromptFactory,
} from '../../../extension/debugger/types';
import { IServiceManager } from '../../../extension/debugger/ioc/types';
import { ServiceManager } from '../../../extension/debugger/ioc/serviceManager';
import { AttachRequestArguments, LaunchRequestArguments } from '../../../extension/types';
import { IDebugService } from '../../../extension/common/application/types';
import { DebugService } from '../../../extension/common/application/debugService';

suite('Debugging - Service Registry', () => {
    let serviceManager: IServiceManager;

    setup(() => {
        serviceManager = mock(ServiceManager);
    });
    test.only('Registrations', () => {
        registerTypes(instance(serviceManager));

        verify(
            serviceManager.addSingleton<IExtensionSingleActivationService>(
                IExtensionSingleActivationService,
                InterpreterPathCommand,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IDebugConfigurationService>(
                IDebugConfigurationService,
                PythonDebugConfigurationService,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IChildProcessAttachService>(
                IChildProcessAttachService,
                ChildProcessAttachService,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IExtensionSingleActivationService>(
                IExtensionSingleActivationService,
                LaunchJsonCompletionProvider,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IExtensionSingleActivationService>(
                IExtensionSingleActivationService,
                LaunchJsonUpdaterService,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IExtensionSingleActivationService>(
                IExtensionSingleActivationService,
                DebugAdapterActivator,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IDebugAdapterDescriptorFactory>(
                IDebugAdapterDescriptorFactory,
                DebugAdapterDescriptorFactory,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IDebugSessionEventHandlers>(
                IDebugSessionEventHandlers,
                ChildProcessAttachEventHandler,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IDebugConfigurationResolver<LaunchRequestArguments>>(
                IDebugConfigurationResolver,
                LaunchConfigurationResolver,
                'launch',
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IDebugConfigurationResolver<AttachRequestArguments>>(
                IDebugConfigurationResolver,
                AttachConfigurationResolver,
                'attach',
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IExtensionSingleActivationService>(
                IExtensionSingleActivationService,
                DebugAdapterActivator,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IDebugAdapterDescriptorFactory>(
                IDebugAdapterDescriptorFactory,
                DebugAdapterDescriptorFactory,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IDebugSessionLoggingFactory>(
                IDebugSessionLoggingFactory,
                DebugSessionLoggingFactory,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IOutdatedDebuggerPromptFactory>(
                IOutdatedDebuggerPromptFactory,
                OutdatedDebuggerPromptFactory,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IAttachProcessProviderFactory>(
                IAttachProcessProviderFactory,
                AttachProcessProviderFactory,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IExtensionSingleActivationService>(
                IExtensionSingleActivationService,
                DebugCommands,
            ),
        ).once();
        verify(
            serviceManager.addSingleton<IDebugService>(
                IDebugService,
                DebugService,
            ),
        ).once();
    });
});
