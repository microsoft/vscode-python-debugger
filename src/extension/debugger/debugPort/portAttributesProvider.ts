/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { CancellationToken, PortAttributes, PortAttributesProvider, ProviderResult } from 'vscode';

export class DebugPortAttributesProvider implements PortAttributesProvider {
    public providePortAttributes(
        _attributes: { port: number; pid?: number; commandLine?: string },
        _token: CancellationToken,
    ): ProviderResult<PortAttributes> {
        return undefined;
    }
}
