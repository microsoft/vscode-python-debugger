/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { PYTHON_LANGUAGE } from '../../../common/constants';
import { getSearchPathEnvVarNames } from '../../../common/utils/exec';
import { EnvironmentVariables } from '../../../common/variables/types';
import { getActiveTextEditor } from '../../../common/vscodeapi';
import { LaunchRequestArguments } from '../../../types';
import * as envParser from '../../../common/variables/environment';

export async function getDebugEnvironmentVariables(args: LaunchRequestArguments): Promise<EnvironmentVariables> {
    const pathVariableName = getSearchPathEnvVarNames()[0];

    // Merge variables from both .env file and env json variables.
    const debugLaunchEnvVars: Record<string, string> =
        args.env && Object.keys(args.env).length > 0
            ? ({ ...args.env } as Record<string, string>)
            : ({} as Record<string, string>);
    const envFileVars = await envParser.parseFile(args.envFile, debugLaunchEnvVars);
    const env = envFileVars ? { ...envFileVars } : {};

    // "overwrite: true" to ensure that debug-configuration env variable values
    // take precedence over env file.
    envParser.mergeVariables(debugLaunchEnvVars, env, { overwrite: true });

    // Append the PYTHONPATH and PATH variables.
    envParser.appendPath(env, debugLaunchEnvVars[pathVariableName]);
    envParser.appendPythonPath(env, debugLaunchEnvVars.PYTHONPATH);

    if (typeof env[pathVariableName] === 'string' && env[pathVariableName]!.length > 0) {
        // Now merge this path with the current system path.
        // We need to do this to ensure the PATH variable always has the system PATHs as well.
        envParser.appendPath(env, process.env[pathVariableName]!);
    }
    if (typeof env.PYTHONPATH === 'string' && env.PYTHONPATH.length > 0) {
        // We didn't have a value for PATH earlier and now we do.
        // Now merge this path with the current system path.
        // We need to do this to ensure the PATH variable always has the system PATHs as well.
        envParser.appendPythonPath(env, process.env.PYTHONPATH!);
    }

    if (args.console === 'internalConsole') {
        // For debugging, when not using any terminal, then we need to provide all env variables.
        // As we're spawning the process, we need to ensure all env variables are passed.
        // Including those from the current process (i.e. everything, not just custom vars).
        envParser.mergeVariables(process.env, env);

        if (env[pathVariableName] === undefined && typeof process.env[pathVariableName] === 'string') {
            env[pathVariableName] = process.env[pathVariableName];
        }
        if (env.PYTHONPATH === undefined && typeof process.env.PYTHONPATH === 'string') {
            env.PYTHONPATH = process.env.PYTHONPATH;
        }
    }

    if (!env.hasOwnProperty('PYTHONIOENCODING')) {
        env.PYTHONIOENCODING = 'UTF-8';
    }
    if (!env.hasOwnProperty('PYTHONUNBUFFERED')) {
        env.PYTHONUNBUFFERED = '1';
    }

    if (args.gevent) {
        env.GEVENT_SUPPORT = 'True'; // this is read in pydevd_constants.py
    }

    return env;
}

export function getProgram(): string | undefined {
    const activeTextEditor = getActiveTextEditor();
    if (activeTextEditor && activeTextEditor.document.languageId === PYTHON_LANGUAGE) {
        return activeTextEditor.document.fileName;
    }
    return undefined;
}
