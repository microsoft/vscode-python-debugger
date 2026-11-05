// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import * as typemoq from 'typemoq';
import { TextDocument, TextEditor } from 'vscode';
import { PYTHON_LANGUAGE } from '../../../../extension/common/constants';
import * as platform from '../../../../extension/common/platform';
import * as vscodeapi from '../../../../extension/common/vscodeapi';
import { getDebugEnvironmentVariables, getProgram } from '../../../../extension/debugger/configuration/resolvers/helper';
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

    test('Debug env vars should normalize duplicate Windows path keys', async () => {
        sinon.stub(platform, 'getOSType').returns(platform.OSType.Windows);

        /* eslint-disable @typescript-eslint/naming-convention */
        const env = await getDebugEnvironmentVariables({
            type: 'debugpy',
            name: 'Launch',
            request: 'launch',
            env: {
                Path: 'C:\\tool-bin',
                PATH: 'C:\\user-bin',
            },
        } as LaunchRequestArguments);
        /* eslint-enable @typescript-eslint/naming-convention */

        expect(env.Path).to.include(`C:\\tool-bin${path.delimiter}C:\\user-bin`);
        expect(env).to.not.have.property('PATH');
    });

    test('Debug env vars should normalize Windows path keys after merging process env', async () => {
        sinon.stub(platform, 'getOSType').returns(platform.OSType.Windows);
        /* eslint-disable @typescript-eslint/naming-convention */
        const processEnvStub = sinon.stub(process, 'env').value({
            Path: 'C:\\system-bin',
            PATH: 'C:\\legacy-system-bin',
        });

        const env = await getDebugEnvironmentVariables({
            type: 'debugpy',
            name: 'Launch',
            request: 'launch',
            console: 'internalConsole',
            env: {
                Path: 'C:\\tool-bin',
            },
        } as LaunchRequestArguments);
        /* eslint-enable @typescript-eslint/naming-convention */

        expect(processEnvStub).to.not.equal(undefined);
        expect(env.Path).to.include(`C:\\tool-bin${path.delimiter}C:\\system-bin`);
        expect(env.Path).to.include('C:\\legacy-system-bin');
        expect(env).to.not.have.property('PATH');
    });
});
