/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { injectable } from 'inversify';
import { DiagnosticSeverity } from 'vscode';
import { showErrorMessage, showInformationMessage, showWarningMessage } from '../../common/vscodeapi';
import { IDiagnostic, IDiagnosticCommand, IDiagnosticHandlerService, IDiagnosticMessageOnCloseHandler } from './types';

export type MessageCommandPrompt = {
    commandPrompts: {
        prompt: string;
        command?: IDiagnosticCommand;
    }[];
    message?: string;
    onClose?: IDiagnosticMessageOnCloseHandler;
};

export const DiagnosticCommandPromptHandlerServiceId = 'DiagnosticCommandPromptHandlerServiceId';

@injectable()
export class DiagnosticCommandPromptHandlerService implements IDiagnosticHandlerService<MessageCommandPrompt> {
    constructor() {}
    public async handle(
        diagnostic: IDiagnostic,
        options: MessageCommandPrompt = { commandPrompts: [] },
    ): Promise<void> {
        const prompts = options.commandPrompts.map((option) => option.prompt);
        const response = await this.displayMessage(
            options.message ? options.message : diagnostic.message,
            diagnostic.severity,
            prompts,
        );
        if (options.onClose) {
            options.onClose(response);
        }
        if (!response) {
            return;
        }
        const selectedOption = options.commandPrompts.find((option) => option.prompt === response);
        if (selectedOption && selectedOption.command) {
            await selectedOption.command.invoke();
        }
    }
    private async displayMessage(
        message: string,
        severity: DiagnosticSeverity,
        prompts: string[],
    ): Promise<string | undefined> {
        switch (severity) {
            case DiagnosticSeverity.Error: {
                return showErrorMessage(message, ...prompts);
            }
            case DiagnosticSeverity.Warning: {
                return showWarningMessage(message, ...prompts);
            }
            default: {
                return showInformationMessage(message, ...prompts);
            }
        }
    }
}
