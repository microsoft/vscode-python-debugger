// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as typemoq from 'typemoq';
import {
    CancellationTokenSource,
    CompletionItem,
    CompletionItemKind,
    Position,
    SnippetString,
    TextDocument,
    Uri,
} from 'vscode';
import { DebugConfigStrings } from '../../../../extension/common/utils/localize';
import { LaunchJsonCompletionProvider } from '../../../../extension/debugger/configuration/launch.json/completionProvider';

suite('Debugging - launch.json Completion Provider', () => {
    let completionProvider: LaunchJsonCompletionProvider;

    setup(() => {
        completionProvider = new LaunchJsonCompletionProvider();
    });
    teardown(() => {
        sinon.restore();
    });
    test('Cannot provide completions for non launch.json files', () => {
        const document = typemoq.Mock.ofType<TextDocument>();
        const position = new Position(0, 0);
        document.setup((doc) => doc.uri).returns(() => Uri.file(__filename));
        assert.strictEqual(LaunchJsonCompletionProvider.canProvideCompletions(document.object, position), false);

        document.reset();
        document.setup((doc) => doc.uri).returns(() => Uri.file('settings.json'));
        assert.strictEqual(LaunchJsonCompletionProvider.canProvideCompletions(document.object, position), false);
    });
    function testCanProvideCompletions(position: Position, offset: number, json: string, expectedValue: boolean) {
        const document = typemoq.Mock.ofType<TextDocument>();
        document.setup((doc) => doc.getText(typemoq.It.isAny())).returns(() => json);
        document.setup((doc) => doc.uri).returns(() => Uri.file('launch.json'));
        document.setup((doc) => doc.offsetAt(typemoq.It.isAny())).returns(() => offset);
        const canProvideCompletions = LaunchJsonCompletionProvider.canProvideCompletions(document.object, position);
        assert.strictEqual(canProvideCompletions, expectedValue);
    }
    test('Cannot provide completions when there is no configurations section in json', () => {
        const position = new Position(0, 0);
        const config = `{
    "version": "0.1.0"
}`;
        testCanProvideCompletions(position, 1, config as string, false);
    });
    test('Cannot provide completions when cursor position is not in configurations array', () => {
        const position = new Position(0, 0);
        const json = `{
    "version": "0.1.0",
    "configurations": []
}`;
        testCanProvideCompletions(position, 10, json, false);
    });
    test('Cannot provide completions when cursor position is in an empty configurations array', () => {
        const position = new Position(0, 0);
        const json = `{
    "version": "0.1.0",
    "configurations": [
        # Cursor Position
    ]
}`;
        testCanProvideCompletions(position, json.indexOf('# Cursor Position'), json, true);
    });
    test('No Completions for non launch.json', async () => {
        const document = typemoq.Mock.ofType<TextDocument>();
        document.setup((doc) => doc.uri).returns(() => Uri.file('settings.json'));
        const { token } = new CancellationTokenSource();
        const position = new Position(0, 0);

        const completions = await completionProvider.provideCompletionItems(document.object, position, token);

        assert.strictEqual(completions.length, 0);
    });
    test('No Completions for files ending with launch.json', async () => {
        const document = typemoq.Mock.ofType<TextDocument>();
        document.setup((doc) => doc.uri).returns(() => Uri.file('x-launch.json'));
        const { token } = new CancellationTokenSource();
        const position = new Position(0, 0);

        const completions = await completionProvider.provideCompletionItems(document.object, position, token);

        assert.strictEqual(completions.length, 0);
    });
    test('Get Completions', async () => {
        const json = `{
            "version": "0.1.0",
            "configurations": [
        # Cursor Position
    ]
}`;

        const document = typemoq.Mock.ofType<TextDocument>();
        document.setup((doc) => doc.getText(typemoq.It.isAny())).returns(() => json);
        document.setup((doc) => doc.uri).returns(() => Uri.file('launch.json'));
        document.setup((doc) => doc.offsetAt(typemoq.It.isAny())).returns(() => json.indexOf('# Cursor Position'));
        const position = new Position(0, 0);
        const { token } = new CancellationTokenSource();

        const completions = await completionProvider.provideCompletionItems(document.object, position, token);

        assert.strictEqual(completions.length, 1);

        const expectedCompletionItem: CompletionItem = {
            command: {
                command: 'debugpy.SelectAndInsertDebugConfiguration',
                title: DebugConfigStrings.launchJsonCompletions.description,
                arguments: [document.object, position, token],
            },
            documentation: DebugConfigStrings.launchJsonCompletions.description,
            sortText: 'AAAA',
            preselect: true,
            kind: CompletionItemKind.Enum,
            label: DebugConfigStrings.launchJsonCompletions.label,
            insertText: new SnippetString(),
        };

        assert.deepEqual(completions[0], expectedCompletionItem);
    });
});
