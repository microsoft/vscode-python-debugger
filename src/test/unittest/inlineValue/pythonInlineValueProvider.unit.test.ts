// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import * as TypeMoq from 'typemoq';
import * as sinon from 'sinon';
import { use, expect } from 'chai';
import { EXTENSION_ROOT_DIR_FOR_TESTS } from '../../constants';
import { PythonInlineValueProvider } from '../../../extension/debugger/inlineValue/pythonInlineValueProvider';
import { workspace, Range, InlineValueContext, WorkspaceConfiguration } from 'vscode';
import * as vscodeapi from '../../../extension/common/vscodeapi';

use(chaiAsPromised);

const WS_ROOT = path.join(EXTENSION_ROOT_DIR_FOR_TESTS, 'src', 'test');

suite('Debugging - pythonInlineProvider', () => {
    let customRequestStub: sinon.SinonStub;
    let getConfigurationStub: sinon.SinonStub;

    setup(() => {
        customRequestStub = sinon.stub(vscodeapi, 'customRequest');
        customRequestStub.withArgs('scopes', sinon.match.any).resolves({ scopes: [{ variablesReference: 0 }] });
        getConfigurationStub = sinon.stub(vscodeapi, 'getConfiguration');
        getConfigurationStub.withArgs('debugpy').returns(createMoqConfiguration(true));
    });

    teardown(async () => {
        sinon.restore();
    });

    function createMoqConfiguration(showPythonInlineValues: boolean) {
        const debugpySettings = TypeMoq.Mock.ofType<WorkspaceConfiguration>();
        debugpySettings
            .setup((p) => p.get<boolean>('showPythonInlineValues', TypeMoq.It.isAny()))
            .returns(() => showPythonInlineValues);
        return debugpySettings.object;
    }

    test('ProvideInlineValues function should return all the vars in the python file', async () => {
        customRequestStub.withArgs('variables', sinon.match.any).resolves({
            variables: [
                {
                    name: 'special variables',
                    value: '',
                    type: '',
                    evaluateName: 'special variables',
                    variablesReference: 5,
                },
                {
                    name: 'var1',
                    value: '7',
                    type: 'int',
                    evaluateName: 'var1',
                    variablesReference: 0,
                },
                {
                    name: 'var2',
                    value: '6',
                    type: 'int',
                    evaluateName: 'var2',
                    variablesReference: 0,
                },
                {
                    name: 'var3',
                    value: "'hola'",
                    type: 'str',
                    evaluateName: 'var3',
                    variablesReference: 0,
                    presentationHint: {
                        attributes: ['rawString'],
                    },
                },
                {
                    name: 'var4',
                    value: "{'a': 1, 'b': 2}",
                    type: 'dict',
                    evaluateName: 'var4',
                    variablesReference: 6,
                },
                {
                    name: 'var5',
                    value: '[1, 2, 3]',
                    type: 'list',
                    evaluateName: 'var5',
                    variablesReference: 7,
                },
            ],
        });
        const file = path.join(WS_ROOT, 'pythonFiles', 'testVarTypes.py');
        let document = await workspace.openTextDocument(file);
        const inlineValueProvider = new PythonInlineValueProvider();

        const viewPort = new Range(0, 0, 5, 0);
        const context = { frameId: 0, stoppedLocation: new Range(4, 1, 4, 1) } as InlineValueContext;

        const result = await inlineValueProvider.provideInlineValues(document, viewPort, context);
        const expected = [
            {
                range: {
                    c: {
                        c: 0,
                        e: 0,
                    },
                    e: {
                        c: 0,
                        e: 4,
                    },
                },
                variableName: 'var1',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 0,
                        e: 6,
                    },
                    e: {
                        c: 0,
                        e: 10,
                    },
                },
                variableName: 'var2',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 1,
                        e: 0,
                    },
                    e: {
                        c: 1,
                        e: 4,
                    },
                },
                variableName: 'var3',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 2,
                        e: 0,
                    },
                    e: {
                        c: 2,
                        e: 4,
                    },
                },
                variableName: 'var4',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 3,
                        e: 0,
                    },
                    e: {
                        c: 3,
                        e: 4,
                    },
                },
                variableName: 'var5',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 4,
                        e: 7,
                    },
                    e: {
                        c: 4,
                        e: 11,
                    },
                },
                variableName: 'var1',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 4,
                        e: 14,
                    },
                    e: {
                        c: 4,
                        e: 18,
                    },
                },
                variableName: 'var2',
                caseSensitiveLookup: false,
            },
        ];
        expect(result).to.deep.equal(expected);
    });

    test('ProvideInlineValues function should return all the vars in the python file with self in class', async () => {
        customRequestStub
            .withArgs('variables', sinon.match.any)
            .onFirstCall()
            .resolves({
                variables: [
                    {
                        name: 'self',
                        value: '<__main__.Person object at 0x10b223310>',
                        type: 'Person',
                        evaluateName: 'self',
                        variablesReference: 5,
                    },
                ],
            });
        customRequestStub.withArgs('variables', sinon.match.any).resolves({
            variables: [
                {
                    name: 'name',
                    value: "'John'",
                    type: 'str',
                    evaluateName: 'self.name',
                    variablesReference: 0,
                },
                {
                    name: 'age',
                    value: '25',
                    type: 'int',
                    evaluateName: 'self.age',
                    variablesReference: 0,
                },
            ],
        });
        const file = path.join(WS_ROOT, 'pythonFiles', 'testClassVarType.py');
        let document = await workspace.openTextDocument(file);
        const inlineValueProvider = new PythonInlineValueProvider();

        const viewPort = new Range(0, 0, 12, 0);
        const context = { frameId: 0, stoppedLocation: new Range(7, 1, 7, 1) } as InlineValueContext;

        const result = await inlineValueProvider.provideInlineValues(document, viewPort, context);
        const expected = [
            {
                range: {
                    c: {
                        c: 3,
                        e: 8,
                    },
                    e: {
                        c: 3,
                        e: 17,
                    },
                },
                expression: 'self.name',
            },
            {
                range: {
                    c: {
                        c: 4,
                        e: 8,
                    },
                    e: {
                        c: 4,
                        e: 16,
                    },
                },
                expression: 'self.age',
            },
            {
                range: {
                    c: {
                        c: 7,
                        e: 18,
                    },
                    e: {
                        c: 7,
                        e: 27,
                    },
                },
                expression: 'self.name',
            },
            {
                range: {
                    c: {
                        c: 7,
                        e: 29,
                    },
                    e: {
                        c: 7,
                        e: 37,
                    },
                },
                expression: 'self.age',
            },
        ];
        expect(result).to.deep.equal(expected);
    });

    test('ProvideInlineValues function should return the vars in the python file with readable class variables', async () => {
        customRequestStub
            .withArgs('variables', sinon.match.any)
            .onFirstCall()
            .resolves({
                variables: [
                    {
                        name: 'person1',
                        value: '<__main__.Person object at 0x1085c92b0>',
                        type: 'Person',
                        evaluateName: 'person1',
                        variablesReference: 7,
                    },
                ],
            });
        customRequestStub.withArgs('variables', sinon.match.any).resolves({
            variables: [
                {
                    name: 'age',
                    value: '30',
                    type: 'int',
                    evaluateName: 'person1.age',
                    variablesReference: 0,
                },
                {
                    name: 'id',
                    value: '1',
                    type: 'int',
                    evaluateName: 'person1.id',
                    variablesReference: 0,
                },
                {
                    name: 'name',
                    value: "'John Doe'",
                    type: 'str',
                    evaluateName: 'person1.name',
                    variablesReference: 0,
                    presentationHint: {
                        attributes: ['rawString'],
                    },
                },
            ],
        });
        const file = path.join(WS_ROOT, 'pythonFiles', 'testClassVarType.py');
        let document = await workspace.openTextDocument(file);
        const inlineValueProvider = new PythonInlineValueProvider();

        const viewPort = new Range(0, 0, 12, 0);
        const context = { frameId: 0, stoppedLocation: new Range(11, 1, 11, 1) } as InlineValueContext;

        const result = await inlineValueProvider.provideInlineValues(document, viewPort, context);
        const expected = [
            {
                range: {
                    c: {
                        c: 11,
                        e: 0,
                    },
                    e: {
                        c: 11,
                        e: 10,
                    },
                },
                expression: 'person1.id',
            },
        ];
        expect(result).to.deep.equal(expected);
    });

    test('ProvideInlineValues function should return all the vars in the python file using Assignment Expressions', async () => {
        customRequestStub.withArgs('variables', sinon.match.any).resolves({
            variables: [
                {
                    name: 'special variables',
                    value: '',
                    type: '',
                    evaluateName: 'special variables',
                    variablesReference: 5,
                },
                {
                    name: 'n',
                    value: '4',
                    type: 'int',
                    evaluateName: 'n',
                    variablesReference: 0,
                },
                {
                    name: 'some_list',
                    value: '[1, 2, 3, 7]',
                    type: 'list',
                    evaluateName: 'some_list',
                    variablesReference: 6,
                },
                {
                    name: 'x',
                    value: '3',
                    type: 'int',
                    evaluateName: 'x',
                    variablesReference: 0,
                },
            ],
        });
        const file = path.join(WS_ROOT, 'pythonFiles', 'testAssignmentExp.py');
        let document = await workspace.openTextDocument(file);
        const inlineValueProvider = new PythonInlineValueProvider();

        const viewPort = new Range(0, 0, 6, 0);
        const context = { frameId: 0, stoppedLocation: new Range(3, 1, 3, 1) } as InlineValueContext;

        const result = await inlineValueProvider.provideInlineValues(document, viewPort, context);
        const expected = [
            {
                range: {
                    c: {
                        c: 0,
                        e: 0,
                    },
                    e: {
                        c: 0,
                        e: 9,
                    },
                },
                variableName: 'some_list',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 1,
                        e: 0,
                    },
                    e: {
                        c: 1,
                        e: 1,
                    },
                },
                variableName: 'x',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 2,
                        e: 4,
                    },
                    e: {
                        c: 2,
                        e: 5,
                    },
                },
                variableName: 'n',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 2,
                        e: 13,
                    },
                    e: {
                        c: 2,
                        e: 22,
                    },
                },
                variableName: 'some_list',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 2,
                        e: 27,
                    },
                    e: {
                        c: 2,
                        e: 28,
                    },
                },
                variableName: 'x',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 3,
                        e: 13,
                    },
                    e: {
                        c: 3,
                        e: 14,
                    },
                },
                variableName: 'n',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 3,
                        e: 16,
                    },
                    e: {
                        c: 3,
                        e: 17,
                    },
                },
                variableName: 'x',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 5,
                        e: 13,
                    },
                    e: {
                        c: 5,
                        e: 14,
                    },
                },
                variableName: 'n',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 5,
                        e: 16,
                    },
                    e: {
                        c: 5,
                        e: 17,
                    },
                },
                variableName: 'x',
                caseSensitiveLookup: false,
            },
        ];
        expect(result).to.deep.equal(expected);
    });
});
