/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import {
    CancellationToken,
    PortAttributes,
    PortAttributesProvider,
    PortAutoForwardAction,
    ProviderResult,
} from 'vscode';

export class DebugPortAttributesProvider implements PortAttributesProvider {
    private knownPorts: number[] = [];

    public setPortAttribute(port: number): void {
        if (!this.knownPorts.includes(port)) {
            this.knownPorts.push(port);
        }
    }

    public resetPortAttribute(): void {
        this.knownPorts.pop();
    }

    public providePortAttributes(
        attributes: { port: number; pid?: number; commandLine?: string },
        _token: CancellationToken,
    ): ProviderResult<PortAttributes> {
        if (this.knownPorts.includes(attributes.port)) {
            return new PortAttributes(PortAutoForwardAction.Ignore);
        }
        return undefined;
    }
}
