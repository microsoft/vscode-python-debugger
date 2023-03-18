// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
// import { Uri } from 'vscode';
import { inject, injectable } from 'inversify';
import { IDebugAdapterDescriptorFactory, IDebugSessionLoggingFactory, IOutdatedDebuggerPromptFactory } from '../types';
// import { executeCommand } from '../../common/vscodeapi';
import { IDebugService } from '../../common/application/types';
import { IDisposableRegistry } from '../../common/types';
import { IExtensionSingleActivationService } from '../../activation/types';
import { IAttachProcessProviderFactory } from '../attachQuickPick/types';
import { DebuggerTypeName } from '../../constants';

@injectable()
export class DebugAdapterActivator implements IExtensionSingleActivationService {
    public readonly supportedWorkspaceTypes = { untrustedWorkspace: false, virtualWorkspace: false };
    constructor(
        @inject(IDebugService) private readonly debugService: IDebugService,
        // @inject(IConfigurationService) private readonly configSettings: IConfigurationService,
        @inject(IDebugAdapterDescriptorFactory) private descriptorFactory: IDebugAdapterDescriptorFactory,
        @inject(IDebugSessionLoggingFactory) private debugSessionLoggingFactory: IDebugSessionLoggingFactory,
        @inject(IOutdatedDebuggerPromptFactory) private debuggerPromptFactory: IOutdatedDebuggerPromptFactory,
        @inject(IDisposableRegistry) private readonly disposables: IDisposableRegistry,
        @inject(IAttachProcessProviderFactory)
        private readonly attachProcessProviderFactory: IAttachProcessProviderFactory,
    ) {}
    public async activate(): Promise<void> {
        this.attachProcessProviderFactory.registerCommands();

        this.disposables.push(
            this.debugService.registerDebugAdapterTrackerFactory(DebuggerTypeName, this.debugSessionLoggingFactory),
        );
        this.disposables.push(
            this.debugService.registerDebugAdapterTrackerFactory(DebuggerTypeName, this.debuggerPromptFactory),
        );
        this.disposables.push(
            this.debugService.registerDebugAdapterDescriptorFactory(DebuggerTypeName, this.descriptorFactory),
        );
        // this.disposables.push(
        //     this.debugService.onDidStartDebugSession((debugSession) => {
        //         if (this.shouldTerminalFocusOnStart(debugSession.workspaceFolder?.uri))
        //             executeCommand('workbench.action.terminal.focus');
        //     }),
        // );
    }

    // private shouldTerminalFocusOnStart(uri: Uri | undefined): boolean {
    //     return getSettings(uri)?.terminal.focusAfterLaunch;
    // }
}
