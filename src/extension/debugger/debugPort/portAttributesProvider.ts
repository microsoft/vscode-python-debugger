/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { CancellationToken, PortAttributes, PortAttributesProvider, PortAutoForwardAction, ProviderResult } from 'vscode';

export class DebugPortAttributesProvider implements PortAttributesProvider {
    private knownPorts: number[] = [];

    public setPortAttribute(port: number): void {
        this.knownPorts.push(port);
    }

    public resetPortAttribute(port: number): void {
        this.knownPorts = this.knownPorts.filter((p) => p !== port);
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
