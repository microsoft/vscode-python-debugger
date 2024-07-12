// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { commands, debug, InlineValue, InlineValueContext, InlineValueEvaluatableExpression, InlineValuesProvider, InlineValueText, InlineValueVariableLookup,
    Range, TextDocument } from "vscode";
import { executeCommand } from "../../common/vscodeapi";


export class PythonInlineValueProvider implements InlineValuesProvider {

    public async provideInlineValues(document: TextDocument, viewPort: Range, context: InlineValueContext): Promise<InlineValue[]> {
        console.log("inline provider");
        let a = JSON.stringify(context);
        const allValues: InlineValue[] = [];

			for (let l = 0; l <= context.stoppedLocation.end.line; l++) {
				const line = document.lineAt(l);
                var re = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
				do {
					var m = re.exec(line.text);
					if (m) {
						const varName = m[0];
						const rng = new Range(l, m.index, l, m.index + varName.length);

						//allValues.push(new vscode.InlineValueText(r, `${varName}: some value`));
						allValues.push(new InlineValueVariableLookup(rng, varName));
						//allValues.push(new vscode.InlineValueEvaluatableExpression(r, varName));
					}
				} while (m);
			}

			return allValues;
        // let variables = await resolveInlineVariables({
        //     uri: document.uri.toString(),
        //     viewPort: viewPort,
        //     stoppedLocation: context.stoppedLocation,
        // });

        return [];
    }
}

// tslint:disable-next-line:interface-name
export interface InlineParams {
    uri: string;
    viewPort?: Range;
    stoppedLocation: Range;
}

// tslint:disable-next-line:interface-name
export enum InlineKind {
    VariableLookup = 0,
    Evaluation = 1,
}

// tslint:disable-next-line:interface-name
export interface InlineVariable {
    range: Range;
    name: string;
    kind: InlineKind;
    expression: string;
    declaringClass: string;
}

export async function resolveInlineVariables(inlineParams: InlineParams): Promise<InlineVariable[]> {
    debug.startDebugging;
    return <InlineVariable[]> await executeCommand("vscode.debug.resolveInlineVariables", JSON.stringify(inlineParams));
}
