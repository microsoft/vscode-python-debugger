// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as sinon from 'sinon';
import * as typemoq from 'typemoq';
import { TextDocument, TextEditor } from 'vscode';
import { PYTHON_LANGUAGE } from '../../../../extension/common/constants';
import * as platform from '../../../../extension/common/platform';
import * as vscodeapi from '../../../../extension/common/vscodeapi';
import {
    getDebugEnvironmentVariables,
    getProgram,
} from '../../../../extension/debugger/configuration/resolvers/helper';
import { LaunchRequestArguments } from '../../../../extension/types';

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

    test('Debug environment should not include duplicate Windows search path keys', async () => {
        sinon.stub(platform, 'getOSType').returns(platform.OSType.Windows);

        const originalPath = process.env.Path;
        const originalPATH = process.env.PATH;
        process.env.Path = 'C:\\Windows\\System32';
        process.env.PATH = 'C:\\Tools';

        try {
            const launchEnv = { ['PATH']: 'C:\\Project\\.venv\\Scripts' };
            const env = await getDebugEnvironmentVariables({
                name: 'Python Debug Test',
                type: 'debugpy',
                request: 'launch',
                env: launchEnv,
                console: 'internalConsole',
            } as unknown as LaunchRequestArguments);

            expect(env).to.have.property('Path');
            expect(env).not.to.have.property('PATH');
            expect(env.Path).to.contain('C:\\Project\\.venv\\Scripts');
            expect(env.Path).to.contain('C:\\Tools');
            expect(env.Path!.split(';').filter((item) => item === 'C:\\Project\\.venv\\Scripts')).to.have.lengthOf(1);
            expect(env.Path!.split(';').filter((item) => item === 'C:\\Tools')).to.have.lengthOf(1);
        } finally {
            if (originalPath === undefined) {
                delete process.env.Path;
            } else {
                process.env.Path = originalPath;
            }
            if (originalPATH === undefined) {
                delete process.env.PATH;
            } else {
                process.env.PATH = originalPATH;
            }
        }
    });
});
