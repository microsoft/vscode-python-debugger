// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as path from 'path';
import '../../common/promiseUtils';
import { EXTENSION_ROOT_DIR } from '../../common/constants';
import { fileToCommandArgumentForPythonExt } from '../../common/stringUtils';

const pathToPythonLibDir = path.join(EXTENSION_ROOT_DIR, 'bundled', 'libs');
const pathToDebugger = path.join(pathToPythonLibDir, 'debugpy');

type RemoteDebugOptions = {
    host: string;
    port: number;
    waitUntilDebuggerAttaches: boolean;
};

export function getDebugpyLauncherArgs(options: RemoteDebugOptions, debuggerPath: string = pathToDebugger) {
    const waitArgs = options.waitUntilDebuggerAttaches ? ['--wait-for-client'] : [];
    return [
        fileToCommandArgumentForPythonExt(debuggerPath),
        '--listen',
        `${options.host}:${options.port}`,
        ...waitArgs,
    ];
}

export function getDebugpyPackagePath(): string {
    return pathToDebugger;
}
