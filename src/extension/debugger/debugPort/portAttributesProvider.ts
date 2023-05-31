/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { CancellationToken, PortAttributes, PortAttributesProvider, PortAutoForwardAction, ProviderResult } from 'vscode';

export const enum DefaultPythonDebugPorts {
    Min = 55000,
    Max = 56000,
}

export class DebugPortAttributesProvider implements PortAttributesProvider {
    /** Cache of used ports (#1092) */
    private cachedResolutions: string[] = new Array(16).fill('');

    /** Index counter for the next cached resolution index in the list */
    private cachedResolutionIndex = 0;

    public providePortAttributes(
        port: number,
        pid: number | undefined,
        commandLine: string | undefined,
        token: CancellationToken
    ): ProviderResult<PortAttributes> {
        if (port >= DefaultPythonDebugPorts.Min && port <= DefaultPythonDebugPorts.Max) {
            return new PortAttributes(PortAutoForwardAction.OpenBrowser);
        } else {
            return undefined;
        }
    }
}
