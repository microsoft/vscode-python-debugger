// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { commands, debug, InlineValue, InlineValueContext, InlineValueEvaluatableExpression, InlineValuesProvider, InlineValueText, InlineValueVariableLookup,
    Range, TextDocument } from "vscode";
import { executeCommand } from "../../common/vscodeapi";


export class PythonInlineValueProvider implements InlineValuesProvider {

    public async provideInlineValues(document: TextDocument, viewPort: Range, context: InlineValueContext): Promise<InlineValue[]> {
        console.log("inline provider");
        let variables = await resolveInlineVariables({
            uri: document.uri.toString(),
            viewPort: viewPort,
            stoppedLocation: context.stoppedLocation,
        });
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
    return <InlineVariable[]> await executeCommand("vscode.python.resolveInlineVariables", JSON.stringify(inlineParams));
}