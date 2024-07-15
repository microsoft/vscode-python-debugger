// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
    InlineValue,
    InlineValueContext,
    InlineValuesProvider,
    Range,
    TextDocument,
    InlineValueVariableLookup,
} from 'vscode';
import { customRequest } from '../../common/vscodeapi';

export class PythonInlineValueProvider implements InlineValuesProvider {
    public async provideInlineValues(
        document: TextDocument,
        viewPort: Range,
        context: InlineValueContext,
    ): Promise<InlineValue[]> {
        let scopesRequest = await customRequest('scopes', { frameId: context.frameId });
        let variablesRequest = await customRequest('variables', {
            variablesReference: scopesRequest.scopes[0].variablesReference,
        });

        //https://docs.python.org/3/reference/lexical_analysis.html#keywords
        const pythonKeywords = [
            'False',
            'await',
            'else',
            'import ',
            'pass',
            'None',
            'break',
            'except',
            'in',
            'raise',
            'True',
            'class',
            'finally',
            'is',
            'return',
            'and',
            'continue',
            'for',
            'lambda',
            'try',
            'as',
            'def',
            'from',
            'nonlocal',
            'while',
            'assert',
            'del',
            'global',
            'not',
            'with',
            'async',
            'elif',
            'if',
            'or',
            'yield',
        ];

        const pythonVariables: any[] = variablesRequest.variables
            .filter((variable: any) => variable.type)
            .map((variable: any) => variable.name);

        //VariableRegex for matching variables names in a python file, excluding strings
        let variableRegex = /(?<!['"\w])\b[a-zA-Z_][a-zA-Z0-9_]*\b(?![^"\n]*"(?:(?:[^"\n]*"){2})*[^"\n]*$)/g;
        const allValues: InlineValue[] = [];
        for (let l = viewPort.start.line; l <= viewPort.end.line; l++) {
            const line = document.lineAt(l);
            // Skip comments
            if (line.text.trimStart().startsWith('#')) {
                continue;
            }

            for (let match = variableRegex.exec(line.text); match; match = variableRegex.exec(line.text)) {
                let varName = match[0];
                // Skip python keywords
                if (pythonKeywords.includes(varName)) {
                    continue;
                }
                if (pythonVariables.includes(varName)) {
                    const rng = new Range(l, match.index, l, match.index + varName.length);
                    allValues.push(new InlineValueVariableLookup(rng, varName, false));
                }
            }
        }
        return allValues;
    }
}
