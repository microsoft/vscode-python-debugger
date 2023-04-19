// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { IExtensionApi } from './apiTypes';
import { getDebugpyLauncherArgs, getDebugpyPackagePath } from './debugger/adapter/remoteLaunchers';

export function buildApi(): IExtensionApi {
    const api: IExtensionApi = {
        debug: {
            async getRemoteLauncherCommand(
                host: string,
                port: number,
                waitUntilDebuggerAttaches: boolean = true,
            ): Promise<string[]> {
                return getDebugpyLauncherArgs({
                    host,
                    port,
                    waitUntilDebuggerAttaches,
                });
            },
            async getDebuggerPackagePath(): Promise<string | undefined> {
                return getDebugpyPackagePath();
            },
        },
    };

    return api;
}
