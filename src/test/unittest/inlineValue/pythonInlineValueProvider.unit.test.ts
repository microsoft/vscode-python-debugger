// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import * as sinon from 'sinon';
import { use, expect } from 'chai';
import { EXTENSION_ROOT_DIR_FOR_TESTS } from '../../constants';
import { PythonInlineValueProvider } from '../../../extension/debugger/inlineValue/pythonInlineValueProvider';
import { workspace, Range, InlineValueContext } from 'vscode';
import * as vscodeapi from '../../../extension/common/vscodeapi';

use(chaiAsPromised);

const WS_ROOT = path.join(EXTENSION_ROOT_DIR_FOR_TESTS, 'src', 'test');

suite('Debugging - pythonInlineProvider', () => {
    let customRequestStub: sinon.SinonStub;

    setup(() => {
        customRequestStub = sinon.stub(vscodeapi, 'customRequest');
        customRequestStub.withArgs('scopes', sinon.match.any).resolves({ scopes: [{ variablesReference: 0 }] });
    });

    teardown(async () => {
        sinon.restore();
    });

    test('ProvideInlineValues function should return all the vars in the python file', async () => {
        customRequestStub.withArgs('variables', sinon.match.any).resolves({
            variables: [
                {
                    name: 'special variables',
                    value: '',
                    type: '',
                    evaluateName: 'special variables',
                    variablesReference: 10,
                },
                {
                    name: 'var1',
                    value: '5',
                    type: 'int',
                    evaluateName: 'var1',
                    variablesReference: 0,
                },
                {
                    name: 'var2',
                    value: '7',
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
                    variablesReference: 8,
                },
                {
                    name: 'var5',
                    value: '[1, 2, 3]',
                    type: 'list',
                    evaluateName: 'var5',
                    variablesReference: 9,
                },
            ],
        });
        const file = path.join(WS_ROOT, 'pythonFiles', 'testVarTypes.py');
        let document = await workspace.openTextDocument(file);
        const inlineValueProvider = new PythonInlineValueProvider();

        const viewPort = new Range(0, 0, 5, 17);
        const context = { frameId: 0, stoppedLocation: new Range(5, 1, 5, 1) } as InlineValueContext;

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
                        c: 1,
                        e: 0,
                    },
                    e: {
                        c: 1,
                        e: 4,
                    },
                },
                variableName: 'var2',
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
                variableName: 'var3',
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
                variableName: 'var4',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 4,
                        e: 0,
                    },
                    e: {
                        c: 4,
                        e: 4,
                    },
                },
                variableName: 'var5',
                caseSensitiveLookup: false,
            },
            {
                range: {
                    c: {
                        c: 5,
                        e: 6,
                    },
                    e: {
                        c: 5,
                        e: 10,
                    },
                },
                variableName: 'var1',
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
                        e: 17,
                    },
                },
                variableName: 'var2',
                caseSensitiveLookup: false,
            },
        ];
        expect(result).to.deep.equal(expected);
    });

    test('ProvideInlineValues function should return all the vars in the python file with class variables', async () => {
        customRequestStub.withArgs('variables', sinon.match.any).resolves({
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
        const file = path.join(WS_ROOT, 'pythonFiles', 'testClassVarType.py');
        let document = await workspace.openTextDocument(file);
        const inlineValueProvider = new PythonInlineValueProvider();

        const viewPort = new Range(0, 0, 10, 0);
        const context = { frameId: 0, stoppedLocation: new Range(6, 1, 6, 1) } as InlineValueContext;

        const result = await inlineValueProvider.provideInlineValues(document, viewPort, context);
        const expected = [
            {
                range: {
                    c: {
                        c: 2,
                        e: 8,
                    },
                    e: {
                        c: 2,
                        e: 17,
                    },
                },
                expression: 'self.name',
            },
            {
                range: {
                    c: {
                        c: 3,
                        e: 8,
                    },
                    e: {
                        c: 3,
                        e: 16,
                    },
                },
                expression: 'self.age',
            },
            {
                range: {
                    c: {
                        c: 6,
                        e: 18,
                    },
                    e: {
                        c: 6,
                        e: 27,
                    },
                },
                expression: 'self.name',
            },
            {
                range: {
                    c: {
                        c: 6,
                        e: 29,
                    },
                    e: {
                        c: 6,
                        e: 37,
                    },
                },
                expression: 'self.age',
            },
        ];
        expect(result).to.deep.equal(expected);
    });
});
