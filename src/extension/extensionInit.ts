// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { Container } from 'inversify';
import { debug, DebugConfigurationProviderTriggerKind, Disposable, ExtensionContext, Memento, Uri } from 'vscode';
import { ServiceContainer } from './debugger/ioc/container';
import { ServiceManager } from './debugger/ioc/serviceManager';
import { IServiceContainer, IServiceManager } from './debugger/ioc/types';
import { ExtensionState } from './types';
import { registerLogger } from './common/log/logging';
import { createOutputChannel, executeCommand, getConfiguration, registerCommand, startDebugging } from './common/vscodeapi';
import { DebugService } from './common/application/debugService';
import { DebuggerTypeName } from './constants';
import { DynamicPythonDebugConfigurationService } from './debugger/configuration/dynamicdebugConfigurationService';
import { registerTypes as variableRegisterTypes } from './common/variables/serviceRegistry';
import { registerTypes as commonRegisterTypes } from './common/serviceRegistry';
import { GLOBAL_MEMENTO, IDisposableRegistry, IExtensionContext, IMemento, WORKSPACE_MEMENTO } from './common/types';
import { registerTypes as processRegisterTypes } from './common/process/serviceRegistry';
import { ChildProcessAttachEventHandler } from './debugger/hooks/childProcessAttachHandler';
import { ChildProcessAttachService } from './debugger/hooks/childProcessAttachService';
import { PythonDebugConfigurationService } from './debugger/configuration/debugConfigurationService';
import { AttachConfigurationResolver } from './debugger/configuration/resolvers/attach';
import { LaunchConfigurationResolver } from './debugger/configuration/resolvers/launch';
import { EnvironmentVariablesService } from './common/variables/environment';
import { DebugEnvironmentVariablesHelper } from './debugger/configuration/resolvers/helper';
import { MultiStepInputFactory } from './common/multiStepInput';
import { sendTelemetryEvent } from './telemetry';
import { Commands } from './common/constants';
import { EventName } from './telemetry/constants';
import { getInterpreterDetails, runPythonExtensionCommand } from './common/python';
import { noop } from './common/utils/misc';
import { getDebugConfiguration } from './debugger/debugCommands';
import { PersistentStateFactory } from './common/persistentState';
// import { DebugSessionTelemetry } from './common/application/debugSessionTelemetry';
import { DebugAdapterDescriptorFactory } from './debugger/adapter/factory';
import { DebugSessionLoggingFactory } from './debugger/adapter/logging';
import { OutdatedDebuggerPromptFactory } from './debugger/adapter/outdatedDebuggerPrompt';
// import { AttachProcessProviderFactory } from './debugger/attachQuickPick/factory';
import { ProcessServiceFactory } from './common/process/processFactory';
import { ProcessLogger } from './common/process/logger';
import { AttachProcessProvider } from './debugger/attachQuickPick/provider';
import { AttachPicker } from './debugger/attachQuickPick/picker';

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

export async function activateLegacy(context: IExtensionContext): Promise<void> {
    // const { context, legacyIOC } = ext;
    // const { serviceManager, serviceContainer } = legacyIOC;

    // register "services"

    // We need to setup this property before any telemetry is sent
    // await setExtensionInstallTelemetryProperties(fs);

    // debugConfigurationRegisterTypes(serviceManager);

    // Note we should not trigger any extension related code which logs, until we have set logging level. So we cannot
    // use configurations service to get level setting. Instead, we use Workspace service to query for setting as it
    // directly queries VSCode API.
    // setLoggingLevel(getLoggingLevel());

    // Language feature registrations.
    // appRegisterTypes(serviceManager);
    // activationRegisterTypes(serviceManager);

    // "initialize" "services"

    // const disposables = serviceManager.get<IDisposableRegistry>(IDisposableRegistry);

    const outputChannel = createOutputChannel('Python Debugger');
    context.subscriptions.push(outputChannel, registerLogger(outputChannel));
    context.subscriptions.push(registerCommand(Commands.ViewOutput, () => outputChannel.show()));

    const childProcessAttachService = new ChildProcessAttachService(DebugService.instance);
    const handlers = [new ChildProcessAttachEventHandler(childProcessAttachService)];

    // const handlers = serviceManager.getAll<IDebugSessionEventHandlers>(IDebugSessionEventHandlers);

    // const dispatcher = new DebugSessionEventDispatcher(handlers, DebugService.instance, context);
    // dispatcher.registerEventHandlers();

    context.subscriptions.push(
        DebugService.instance.onDidReceiveDebugSessionCustomEvent((e) => {
            handlers.forEach((handler) =>
                handler.handleCustomEvent ? handler.handleCustomEvent(e).ignoreErrors() : undefined,
            );
        }),
    );
    // context.subscriptions.push(
    //     DebugService.instance.onDidTerminateDebugSession((e) => {
    //         handlers.forEach((handler) =>
    //             handler.handleTerminateEvent ? handler.handleTerminateEvent(e).ignoreErrors() : undefined,
    //         );
    //     }),
    // );

    // serviceContainer.get<IApplicationDiagnostics>(IApplicationDiagnostics).register();

    // serviceContainer
    //     .getAll<DebugConfigurationProvider>(IDebugConfigurationService)
    //     .forEach((debugConfigProvider) => {
    //         disposables.push(debug.registerDebugConfigurationProvider(DebuggerTypeName, debugConfigProvider));
    //     });
    const environmentVariablesService = new EnvironmentVariablesService();
    const debugEnvironmentVariablesHelper = new DebugEnvironmentVariablesHelper(environmentVariablesService);
    const attachConfigurationResolver = new AttachConfigurationResolver();
    const launchConfigurationResolver = new LaunchConfigurationResolver(debugEnvironmentVariablesHelper);
    const multiStepInputFactory = new MultiStepInputFactory();
    const debugConfigProvider = new PythonDebugConfigurationService(
        attachConfigurationResolver,
        launchConfigurationResolver,
        multiStepInputFactory,
    );
    context.subscriptions.push(debug.registerDebugConfigurationProvider(DebuggerTypeName, debugConfigProvider));

    // register a dynamic configuration provider for 'debugpy' debug type

    context.subscriptions.push(
        debug.registerDebugConfigurationProvider(
            DebuggerTypeName,
            new DynamicPythonDebugConfigurationService(),
            DebugConfigurationProviderTriggerKind.Dynamic,
        ),
    );

    // "activate" everything else

    // const manager = serviceContainer.get<IExtensionActivationManager>(IExtensionActivationManager);
    // disposables.push(manager);
    // const activationPromise = manager.activate();
    
    // const debugCommands = new DebugCommands(context.subscriptions);
    // debugCommands.activate();

    context.subscriptions.push(
        registerCommand(Commands.Debug_In_Terminal, async (file?: Uri) => {
            sendTelemetryEvent(EventName.DEBUG_IN_TERMINAL_BUTTON);
            const interpreter = await getInterpreterDetails(file);
            if (!interpreter.path) {
                runPythonExtensionCommand(Commands.TriggerEnvironmentSelection, file).then(noop, noop);
                return;
            }
            const config = await getDebugConfiguration(file);
            startDebugging(undefined, config);
        }),
    );



    //PersistentStateFactory
    const persistantState = new PersistentStateFactory(context.globalState, context.workspaceState);
    persistantState.activate();

    // const debugSessionTelemetry = new DebugSessionTelemetry(context.subscriptions, DebugService.instance);
    // debugSessionTelemetry.activate();

    const debugAdapterDescriptorFactory = new DebugAdapterDescriptorFactory(persistantState);
    const debugSessionLoggingFactory = new DebugSessionLoggingFactory();
    const debuggerPromptFactory = new OutdatedDebuggerPromptFactory();
    const processLogger = new ProcessLogger();
    const processServiceFactory = new ProcessServiceFactory(processLogger, context.subscriptions);
    // const attachProcessProviderFactory = new AttachProcessProviderFactory(processServiceFactory, context.subscriptions);
    // const debugAdapterActivator = new DebugAdapterActivator(
    //     DebugService.instance,
    //     debugAdapterDescriptorFactory,
    //     debugSessionLoggingFactory,
    //     debuggerPromptFactory,
    //     context.subscriptions,
    //     attachProcessProviderFactory,
    // );
    // debugAdapterActivator.activate();

    // attachProcessProviderFactory.registerCommands();
    
    const attachProcessProvider = new AttachProcessProvider(processServiceFactory);
    const attachPicker = new AttachPicker(attachProcessProvider);
    // const disposable = registerCommand(Commands.PickLocalProcess, () => picker.showQuickPick(),);
    context.subscriptions.push(
        registerCommand(Commands.PickLocalProcess, () => attachPicker.showQuickPick(),)
    );
    context.subscriptions.push(
        DebugService.instance.registerDebugAdapterTrackerFactory(DebuggerTypeName, debugSessionLoggingFactory),
    );
    context.subscriptions.push(
        DebugService.instance.registerDebugAdapterTrackerFactory(DebuggerTypeName, debuggerPromptFactory),
    );
    context.subscriptions.push(
        DebugService.instance.registerDebugAdapterDescriptorFactory(DebuggerTypeName, debugAdapterDescriptorFactory),
    );
    context.subscriptions.push(
        DebugService.instance.onDidStartDebugSession((debugSession) => {
            const shouldTerminalFocusOnStart = getConfiguration('python', debugSession.workspaceFolder?.uri)?.terminal.focusAfterLaunch;
            if (shouldTerminalFocusOnStart) {
                executeCommand('workbench.action.terminal.focus');
            }
        }),
    );
}

// /**
//  * Registers standard utils like experiment and platform code which are fundamental to the extension.
//  */
// export function initializeStandard(ext: ExtensionState): void {
//     const { serviceManager } = ext.legacyIOC;
//     // Core registrations (non-feature specific).
//     commonRegisterTypes(serviceManager);
//     variableRegisterTypes(serviceManager);
//     processRegisterTypes(serviceManager);
//     // We will be pulling other code over from activateLegacy().
// }
