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

        let includeTypes = ['int', 'float', 'str', 'list', 'dict', 'tuple', 'set', 'bool'];

        const pythonVariables = variablesRequest.variables
            .filter((variable: any) => variable.type)
            .reduce((acc: { [key: string]: any }, variable: any) => {
                acc[variable.name] = {
                    type: variable.type,
                    variablesReference: variable.variablesReference,
                };
                return acc;
            }, {});

        let variableRegex = new RegExp(
            '(?:[a-zA-Z_][a-zA-Z0-9_]*\\.)*' + //match any number of variable names separated by '.'
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
                let baseVarName = varName.split('.')[0];
                if (pythonVariables.hasOwnProperty(baseVarName)) {
                    if (varName.includes('.')) {
                        //Find variable name in the variable children
                        let foundVariable = (
                            await customRequest('variables', {
                                variablesReference: pythonVariables[baseVarName].variablesReference,
                            })
                        ).variables.find((variable: any) => variable.evaluateName === varName);
                        //Check the type of the variable before adding to the inline values
                        if (foundVariable && includeTypes.includes(foundVariable.type)) {
                            const rng = new Range(l, match.index, l, match.index + varName.length);
                            allValues.push(new InlineValueEvaluatableExpression(rng, varName));
                        }
                    } else {
                        //Check the type of the variable before adding to the inline values
                        if (includeTypes.includes(pythonVariables[baseVarName].type)) {
                            const rng = new Range(l, match.index, l, match.index + varName.length);
                            allValues.push(new InlineValueVariableLookup(rng, varName, false));
                        }
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
        const processedContent = result;

        return match[0] + processedContent + match[0];
    });
}
