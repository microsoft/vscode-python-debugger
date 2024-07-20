// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
    InlineValue,
    InlineValueContext,
    InlineValuesProvider,
    Range,
    TextDocument,
    InlineValueVariableLookup,
    InlineValueEvaluatableExpression,
} from 'vscode';
import { customRequest } from '../../common/vscodeapi';
import { sendTelemetryEvent } from '../../telemetry';
import { EventName } from '../../telemetry/constants';

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
            'self',
        ];

        const pythonVariables: any[] = variablesRequest.variables
            .filter((variable: any) => variable.type)
            .map((variable: any) => variable.name);

        let variableRegex = new RegExp(
            '(?:self.)?' + //match self. if present
                '[a-zA-Z_][a-zA-Z0-9_]*', //math variable name
            'g',
        );

        const allValues: InlineValue[] = [];
        for (let l = viewPort.start.line; l <= viewPort.end.line; l++) {
            const line = document.lineAt(l);
            // Skip comments
            if (line.text.trimStart().startsWith('#')) {
                continue;
            }

            let code = removeCharsOutsideBraces(line.text);

            for (let match = variableRegex.exec(code); match; match = variableRegex.exec(code)) {
                let varName = match[0];
                // Skip python keywords
                if (pythonKeywords.includes(varName)) {
                    continue;
                }
                if (pythonVariables.includes(varName.split('.')[0])) {
                    if (varName.includes('self')) {
                        const rng = new Range(l, match.index, l, match.index + varName.length);
                        allValues.push(new InlineValueEvaluatableExpression(rng, varName));
                    } else {
                        const rng = new Range(l, match.index, l, match.index + varName.length);
                        allValues.push(new InlineValueVariableLookup(rng, varName, false));
                    }
                }
            }
        }
        sendTelemetryEvent(EventName.DEBUGGER_SHOW_PYTHON_INLINE_VALUES);
        return allValues;
    }
}

function removeCharsOutsideBraces(code: string): string {
    // Regular expression to find Python strings
    const stringRegex = /(["'])(?:(?=(\\?))\2.)*?\1/g;

    //Regular expression to match values inside {}
    const insideBracesRegex = /{[^{}]*}/g;

    return code.replace(stringRegex, (match) => {
        const content = match.slice(1, -1);

        let result = '';
        let tempMatch;

        while ((tempMatch = insideBracesRegex.exec(content)) !== null) {
            result += tempMatch[0];
        }
        const processedContent = result || content;

        return match[0] + processedContent + match[0];
    });
}
