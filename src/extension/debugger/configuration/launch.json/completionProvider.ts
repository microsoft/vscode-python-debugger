// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { getLocation } from 'jsonc-parser';
import * as path from 'path';
import {
    CancellationToken,
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    Position,
    SnippetString,
    TextDocument,
} from 'vscode';
import { DebugConfigStrings } from '../../../common/utils/localize';

const configurationNodeName = 'configurations';
export enum JsonLanguages {
    json = 'json',
    jsonWithComments = 'jsonc',
}

export class LaunchJsonCompletionProvider implements CompletionItemProvider {
    public readonly supportedWorkspaceTypes = { untrustedWorkspace: false, virtualWorkspace: false };

    // eslint-disable-next-line class-methods-use-this
    public async provideCompletionItems(
        document: TextDocument,
        position: Position,
        token: CancellationToken,
    ): Promise<CompletionItem[]> {
        if (!LaunchJsonCompletionProvider.canProvideCompletions(document, position)) {
            return [];
        }

        return [
            {
                command: {
                    command: 'debugpy.SelectAndInsertDebugConfiguration',
                    title: DebugConfigStrings.launchJsonCompletions.description,
                    arguments: [document, position, token],
                },
                documentation: DebugConfigStrings.launchJsonCompletions.description,
                sortText: 'AAAA',
                preselect: true,
                kind: CompletionItemKind.Enum,
                label: DebugConfigStrings.launchJsonCompletions.label,
                insertText: new SnippetString(),
            },
        ];
    }

    public static canProvideCompletions(document: TextDocument, position: Position): boolean {
        if (path.basename(document.uri.fsPath) !== 'launch.json') {
            return false;
        }
        const location = getLocation(document.getText(), document.offsetAt(position));
        // Cursor must be inside the configurations array and not in any nested items.
        // Hence path[0] = array, path[1] = array element index.
        return location.path[0] === configurationNodeName && location.path.length === 2;
    }
}
