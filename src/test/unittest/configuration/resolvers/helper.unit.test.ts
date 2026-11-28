/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as sinon from 'sinon';
import * as typemoq from 'typemoq';
import { TextDocument, TextEditor } from 'vscode';
import { PYTHON_LANGUAGE } from '../../../../extension/common/constants';
import * as vscodeapi from '../../../../extension/common/vscodeapi';
import { OSType } from '../../../../extension/common/platform';
import {
    getProgram,
    normalizeEnvironmentVariableCase,
} from '../../../../extension/debugger/configuration/resolvers/helper';

suite('Debugging - Helpers', () => {
    let getActiveTextEditorStub: sinon.SinonStub;

    setup(() => {
        getActiveTextEditorStub = sinon.stub(vscodeapi, 'getActiveTextEditor');
    });
    teardown(() => {
        sinon.restore();
    });

    test('Program should return filepath of active editor if file is python', () => {
        const expectedFileName = 'my.py';
        const editor = typemoq.Mock.ofType<TextEditor>();
        const doc = typemoq.Mock.ofType<TextDocument>();

        editor
            .setup((e) => e.document)
            .returns(() => doc.object)
            .verifiable(typemoq.Times.once());
        doc.setup((d) => d.languageId)
            .returns(() => PYTHON_LANGUAGE)
            .verifiable(typemoq.Times.once());
        doc.setup((d) => d.fileName)
            .returns(() => expectedFileName)
            .verifiable(typemoq.Times.once());

        getActiveTextEditorStub.returns(editor.object);

        const program = getProgram();

        expect(program).to.be.equal(expectedFileName);
    });
    test('Program should return undefined if active file is not python', () => {
        const editor = typemoq.Mock.ofType<TextEditor>();
        const doc = typemoq.Mock.ofType<TextDocument>();

        editor
            .setup((e) => e.document)
            .returns(() => doc.object)
            .verifiable(typemoq.Times.once());
        doc.setup((d) => d.languageId)
            .returns(() => 'C#')
            .verifiable(typemoq.Times.once());
        getActiveTextEditorStub.returns(editor.object);

        const program = getProgram();

        expect(program).to.be.equal(undefined, 'Not undefined');
    });
    test('Program should return undefined if there is no active editor', () => {
        getActiveTextEditorStub.returns(undefined);

        const program = getProgram();

        expect(program).to.be.equal(undefined, 'Not undefined');
    });

    suite('normalizeEnvironmentVariableCase', () => {
        test('Merges "Path" and "PATH" into a single entry on Windows', () => {
            const result = normalizeEnvironmentVariableCase(
                { Path: 'C:a;C:\b', PATH: 'C:\b;C:c', FOO: '1' },
                OSType.Windows,
            );
            expect(result).to.deep.equal({ Path: 'C:a;C:\b;C:c', FOO: '1' });
        });

        test('Last value wins for other variables differing only in case on Windows', () => {
            const result = normalizeEnvironmentVariableCase({ Foo: '1', FOO: '2' }, OSType.Windows);
            expect(result).to.deep.equal({ FOO: '2' });
        });

        test('Leaves env untouched on non-Windows platforms', () => {
            const env = { Path: 'a', PATH: 'b' };
            expect(normalizeEnvironmentVariableCase(env, OSType.Linux)).to.deep.equal(env);
        });
    });
});
