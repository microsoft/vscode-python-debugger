// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { Container } from 'inversify';
import { debug, DebugConfigurationProvider, DebugConfigurationProviderTriggerKind, Disposable, ExtensionContext, Memento, workspace } from 'vscode';
import { ServiceContainer } from './debugger/ioc/container';
import { ServiceManager } from './debugger/ioc/serviceManager';
import { IServiceContainer, IServiceManager } from './debugger/ioc/types';
import { ExtensionState } from './types';
import { registerTypes as debugConfigurationRegisterTypes } from './debugger/serviceRegistry';
import { registerTypes as appRegisterTypes } from './application/serviceRegistry';
import { getLoggingLevel, setLoggingLevel } from './common/log/logging';
import { createOutputChannel, isVirtualWorkspace } from './common/vscodeapi';
import { IDebugConfigurationService, IDebugSessionEventHandlers, IDynamicDebugConfigurationService } from './debugger/types';
import { DebugSessionEventDispatcher } from './debugger/hooks/eventHandlerDispatcher';
import { DebugService } from './common/application/debugService';
import { DebuggerTypeName } from './constants';
import { DynamicPythonDebugConfigurationService } from './debugger/configuration/dynamicdebugConfigurationService';
import { IApplicationDiagnostics } from './application/types';
import { registerTypes as variableRegisterTypes } from './common/variables/serviceRegistry';
import { registerTypes as commonRegisterTypes } from './common/serviceRegistry';
import { GLOBAL_MEMENTO, IDisposableRegistry, IExtensionContext, IMemento, WORKSPACE_MEMENTO } from './common/types';
import { ActivationResult } from './components';
import { IExtensionActivationManager } from './activation/types';
import { registerTypes as activationRegisterTypes } from './activation/serviceRegistry';
import { registerTypes as processRegisterTypes } from './common/process/serviceRegistry';



// The code in this module should do nothing more complex than register
// objects to DI and simple init (e.g. no side effects).  That implies
// that constructors are likewise simple and do no work.  It also means
// that it is inherently synchronous.

export function initializeGlobals(
    // This is stored in ExtensionState.
    context: ExtensionContext,
): ExtensionState {
    const disposables: IDisposableRegistry = context.subscriptions;
    const cont = new Container({ skipBaseClassChecks: true });
    const serviceManager = new ServiceManager(cont);
    const serviceContainer = new ServiceContainer(cont);

    serviceManager.addSingletonInstance<IServiceContainer>(IServiceContainer, serviceContainer);
    serviceManager.addSingletonInstance<IServiceManager>(IServiceManager, serviceManager);
    serviceManager.addSingletonInstance<Disposable[]>(IDisposableRegistry, disposables);
    
    serviceManager.addSingletonInstance<Memento>(IMemento, context.globalState, GLOBAL_MEMENTO);
    serviceManager.addSingletonInstance<Memento>(IMemento, context.workspaceState, WORKSPACE_MEMENTO);
    serviceManager.addSingletonInstance<IExtensionContext>(IExtensionContext, context);

    return {
        context,
        disposables,
        legacyIOC: { serviceManager, serviceContainer },
    };
}

export async function activateLegacy(ext: ExtensionState): Promise<ActivationResult> {
    const { context, legacyIOC } = ext;
    const { serviceManager, serviceContainer } = legacyIOC;

    // register "services"

    // We need to setup this property before any telemetry is sent
    // await setExtensionInstallTelemetryProperties(fs);

    // const applicationEnv = serviceManager.get<IApplicationEnvironment>(IApplicationEnvironment);
    // const { enableProposedApi } = applicationEnv.packageJson;
    // serviceManager.addSingletonInstance<boolean>(enableProposedApi);
    // Feature specific registrations.
    // unitTestsRegisterTypes(serviceManager);
    // lintersRegisterTypes(serviceManager);
    // formattersRegisterTypes(serviceManager);
    // installerRegisterTypes(serviceManager);
    // commonRegisterTerminalTypes(serviceManager);
    debugConfigurationRegisterTypes(serviceManager);
    // tensorBoardRegisterTypes(serviceManager);

    // Note we should not trigger any extension related code which logs, until we have set logging level. So we cannot
    // use configurations service to get level setting. Instead, we use Workspace service to query for setting as it
    // directly queries VSCode API.
    setLoggingLevel(getLoggingLevel());


    // Language feature registrations.
    appRegisterTypes(serviceManager);
    activationRegisterTypes(serviceManager);


    // activationRegisterTypes(serviceManager);

    // "initialize" "services"

    const disposables = serviceManager.get<IDisposableRegistry>(IDisposableRegistry);

    const outputChannel = createOutputChannel("Python Debugger");
    context.subscriptions.push(outputChannel);
    // disposables.push(registerCommand(Commands.ViewOutput, () => outputChannel.show()));

    // languages.setLanguageConfiguration(PYTHON_LANGUAGE, getLanguageConfiguration());
    if (workspace.isTrusted) {
        if (!isVirtualWorkspace()) {
            const handlers = serviceManager.getAll<IDebugSessionEventHandlers>(IDebugSessionEventHandlers);
            const dispatcher = new DebugSessionEventDispatcher(handlers, DebugService.instance, disposables);
            dispatcher.registerEventHandlers();

            serviceContainer.get<IApplicationDiagnostics>(IApplicationDiagnostics).register();


            serviceContainer
                .getAll<DebugConfigurationProvider>(IDebugConfigurationService)
                .forEach((debugConfigProvider) => {
                    disposables.push(debug.registerDebugConfigurationProvider(DebuggerTypeName, debugConfigProvider));
                });

            // register a dynamic configuration provider for 'python-debugger' debug type
            context.subscriptions.push(
                debug.registerDebugConfigurationProvider(
                    DebuggerTypeName,
                    serviceContainer.get<DynamicPythonDebugConfigurationService>(IDynamicDebugConfigurationService),
                    DebugConfigurationProviderTriggerKind.Dynamic,
                ),
            );
        }
    }

    // "activate" everything else

    const manager = serviceContainer.get<IExtensionActivationManager>(IExtensionActivationManager);
    disposables.push(manager);

    const activationPromise = manager.activate();

    return { fullyReady: activationPromise };
}

/**
 * Registers standard utils like experiment and platform code which are fundamental to the extension.
 */
export function initializeStandard(ext: ExtensionState): void {
    const { serviceManager } = ext.legacyIOC;
    // Core registrations (non-feature specific).
    commonRegisterTypes(serviceManager);
    variableRegisterTypes(serviceManager);
    processRegisterTypes(serviceManager);
    // We will be pulling other code over from activateLegacy().
}