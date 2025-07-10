// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { DiagnosticSeverity, l10n, languages, MessageOptions, window } from 'vscode';
import { getConfiguration } from './vscodeapi';

export async function resolveOnErrorsAction(): Promise<OnErrorsActions> {
    const onErrors = getConfiguration('debugpy').get<string>('onErrors', OnErrorsActions.debugAnyway);
    if (onErrors === OnErrorsActions.debugAnyway) {
        return OnErrorsActions.debugAnyway;
    }

    const hasErrors = languages
        .getDiagnostics()
        .map((d) => {
            return d[1];
        })
        .flat()
        .some((d) => {
            return d.severity === DiagnosticSeverity.Error;
        });
    if (!hasErrors) {
        return OnErrorsActions.debugAnyway;
    }

    if (onErrors === OnErrorsActions.prompt) {
        const message = l10n.t('Error exists before debugging.');
        const options: MessageOptions = { modal: true };
        const actions = [
            { title: 'Debug Anyway', id: OnErrorsActions.debugAnyway },
            { title: 'Show Errors', id: OnErrorsActions.showErrors },
            { title: 'Abort', id: OnErrorsActions.abort, isCloseAffordance: true },
        ];

        const result = await window.showWarningMessage(message, options, ...actions);
        return (result?.id as OnErrorsActions) ?? OnErrorsActions.abort;
    }

    return onErrors as OnErrorsActions;
}

export enum OnErrorsActions {
    debugAnyway = 'debugAnyway',
    showErrors = 'showErrors',
    abort = 'abort',
    prompt = 'prompt',
}
