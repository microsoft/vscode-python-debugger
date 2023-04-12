// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { IExtensionApi } from './apiTypes';
import { traceError } from './common/log/logging';
import { getDebugpyLauncherArgs, getDebugpyPackagePath } from './debugger/adapter/remoteLaunchers';

export function buildApi(
    ready: Promise<any>
): IExtensionApi {
    const api: IExtensionApi = {
        // 'ready' will propagate the exception, but we must log it here first.
        ready: ready.catch((ex) => {
            traceError('Failure during activation.', ex);
            return Promise.reject(ex);
        }),
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
