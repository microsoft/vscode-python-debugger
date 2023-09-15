// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { debug, DebugConfigurationProviderTriggerKind, languages, Uri, window, workspace } from 'vscode';
import { executeCommand, getConfiguration, registerCommand, startDebugging } from './common/vscodeapi';
import { DebuggerTypeName } from './constants';
import { DynamicPythonDebugConfigurationService } from './debugger/configuration/dynamicdebugConfigurationService';
import { IExtensionContext } from './common/types';
import { ChildProcessAttachEventHandler } from './debugger/hooks/childProcessAttachHandler';
import { ChildProcessAttachService } from './debugger/hooks/childProcessAttachService';
import { PythonDebugConfigurationService } from './debugger/configuration/debugConfigurationService';
import { AttachConfigurationResolver } from './debugger/configuration/resolvers/attach';
import { LaunchConfigurationResolver } from './debugger/configuration/resolvers/launch';
import { MultiStepInputFactory } from './common/multiStepInput';
import { sendTelemetryEvent } from './telemetry';
import { Commands } from './common/constants';
import { EventName } from './telemetry/constants';
import { getInterpreterDetails, runPythonExtensionCommand } from './common/python';
import { noop } from './common/utils/misc';
import { getDebugConfiguration } from './debugger/debugCommands';
import { PersistentStateFactory } from './common/persistentState';
import { DebugAdapterDescriptorFactory } from './debugger/adapter/factory';
import { DebugSessionLoggingFactory } from './debugger/adapter/logging';
import { OutdatedDebuggerPromptFactory } from './debugger/adapter/outdatedDebuggerPrompt';
import { AttachProcessProvider } from './debugger/attachQuickPick/provider';
import { AttachPicker } from './debugger/attachQuickPick/picker';
import { DebugSessionTelemetry } from './common/application/debugSessionTelemetry';
import { JsonLanguages, LaunchJsonCompletionProvider } from './debugger/configuration/launch.json/completionProvider';
import { LaunchJsonUpdaterServiceHelper } from './debugger/configuration/launch.json/updaterServiceHelper';
import { ignoreErrors } from './common/promiseUtils';
import { pickArgsInput } from './common/utils/localize';
import { DebugPortAttributesProvider } from './debugger/debugPort/portAttributesProvider';

export async function registerDebugger(context: IExtensionContext): Promise<void> {
    const childProcessAttachService = new ChildProcessAttachService();
    const childProcessAttachEventHandler = new ChildProcessAttachEventHandler(childProcessAttachService);

    context.subscriptions.push(
        debug.onDidReceiveDebugSessionCustomEvent((e) => {
            ignoreErrors(childProcessAttachEventHandler.handleCustomEvent(e));
        }),
    );
    const attachConfigurationResolver = new AttachConfigurationResolver();
    const launchConfigurationResolver = new LaunchConfigurationResolver();
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

    const attachProcessProvider = new AttachProcessProvider();
    const attachPicker = new AttachPicker(attachProcessProvider);
    context.subscriptions.push(registerCommand(Commands.PickLocalProcess, () => attachPicker.showQuickPick()));
    context.subscriptions.push(
        registerCommand(Commands.PickArguments, () => {
            return window.showInputBox({ title: pickArgsInput.title, prompt: pickArgsInput.prompt });
        }),
    );

    const debugAdapterDescriptorFactory = new DebugAdapterDescriptorFactory(persistantState);
    const debugSessionLoggingFactory = new DebugSessionLoggingFactory();
    const debuggerPromptFactory = new OutdatedDebuggerPromptFactory();
    context.subscriptions.push(debug.registerDebugAdapterTrackerFactory(DebuggerTypeName, debugSessionLoggingFactory));
    context.subscriptions.push(debug.registerDebugAdapterTrackerFactory(DebuggerTypeName, debuggerPromptFactory));
    context.subscriptions.push(
        debug.registerDebugAdapterDescriptorFactory(DebuggerTypeName, debugAdapterDescriptorFactory),
    );
    context.subscriptions.push(
        debug.onDidStartDebugSession((debugSession) => {
            const shouldTerminalFocusOnStart = getConfiguration('python', debugSession.workspaceFolder?.uri)?.terminal
                .focusAfterLaunch;
            if (shouldTerminalFocusOnStart) {
                executeCommand('workbench.action.terminal.focus');
            }
        }),
    );

    context.subscriptions.push(debug.registerDebugAdapterTrackerFactory(DebuggerTypeName, new DebugSessionTelemetry()));

    const launchJsonUpdaterServiceHelper = new LaunchJsonUpdaterServiceHelper(debugConfigProvider);
    context.subscriptions.push(
        registerCommand(
            Commands.SelectDebugConfig,
            launchJsonUpdaterServiceHelper.selectAndInsertDebugConfig,
            launchJsonUpdaterServiceHelper,
        ),
    );

    const launchJsonCompletionProvider = new LaunchJsonCompletionProvider();
    context.subscriptions.push(
        languages.registerCompletionItemProvider({ language: JsonLanguages.json }, launchJsonCompletionProvider),
    );
    context.subscriptions.push(
        languages.registerCompletionItemProvider(
            { language: JsonLanguages.jsonWithComments },
            launchJsonCompletionProvider,
        ),
    );

    const debugPortAttributesProvider = new DebugPortAttributesProvider();
    context.subscriptions.push(
        workspace.registerPortAttributesProvider(
            { commandPattern: /extensions.ms-python.debugpy.*debugpy.(launcher|adapter)/ },
            debugPortAttributesProvider,
        ),
    );
}
