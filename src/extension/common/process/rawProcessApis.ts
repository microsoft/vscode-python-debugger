// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { execSync, spawn } from 'child_process';
import { Readable } from 'stream';
import { IDisposable } from '../types';
import { createDeferred } from '../utils/async';
import { EnvironmentVariables } from '../variables/types';
import { DEFAULT_ENCODING } from './constants';
import { ExecutionResult, ShellOptions, SpawnOptions, StdErrError } from './types';
import { noop } from '../utils/misc';
import { decodeBuffer } from './decoder';

const PS_ERROR_SCREEN_BOGUS = /your [0-9]+x[0-9]+ screen size is bogus\. expect trouble/;

function getDefaultOptions<T extends ShellOptions | SpawnOptions>(options: T, defaultEnv?: EnvironmentVariables): T {
    const defaultOptions = { ...options };
    const execOptions = defaultOptions as SpawnOptions;
    if (execOptions) {
        execOptions.encoding =
            typeof execOptions.encoding === 'string' && execOptions.encoding.length > 0
                ? execOptions.encoding
                : DEFAULT_ENCODING;
        const { encoding } = execOptions;
        delete execOptions.encoding;
        execOptions.encoding = encoding;
    }
    if (!defaultOptions.env || Object.keys(defaultOptions.env).length === 0) {
        const env = defaultEnv || process.env;
        defaultOptions.env = { ...env };
    } else {
        defaultOptions.env = { ...defaultOptions.env };
    }

    if (execOptions && execOptions.extraVariables) {
        defaultOptions.env = { ...defaultOptions.env, ...execOptions.extraVariables };
    }

    // Always ensure we have unbuffered output.
    defaultOptions.env.PYTHONUNBUFFERED = '1';
    if (!defaultOptions.env.PYTHONIOENCODING) {
        defaultOptions.env.PYTHONIOENCODING = 'utf-8';
    }

    return defaultOptions;
}

export function plainExec(
    file: string,
    args: string[],
    options: SpawnOptions = {},
    defaultEnv?: EnvironmentVariables,
    disposables?: Set<IDisposable>,
): Promise<ExecutionResult<string>> {
    const spawnOptions = getDefaultOptions(options, defaultEnv);
    const encoding = spawnOptions.encoding ? spawnOptions.encoding : 'utf8';
    const proc = spawn(file, args, spawnOptions);
    // Listen to these errors (unhandled errors in streams tears down the process).
    // Errors will be bubbled up to the `error` event in `proc`, hence no need to log.
    proc.stdout?.on('error', noop);
    proc.stderr?.on('error', noop);
    const deferred = createDeferred<ExecutionResult<string>>();
    const disposable: IDisposable = {
        dispose: () => {
            if (!proc.killed && !deferred.completed) {
                proc.kill();
            }
        },
    };
    disposables?.add(disposable);
    const internalDisposables: IDisposable[] = [];

    // eslint-disable-next-line @typescript-eslint/ban-types
    const on = (ee: Readable | null, name: string, fn: Function) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ee?.on(name, fn as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        internalDisposables.push({ dispose: () => ee?.removeListener(name, fn as any) as any });
    };

    if (options.token) {
        internalDisposables.push(options.token.onCancellationRequested(disposable.dispose));
    }

    const stdoutBuffers: Buffer[] = [];
    on(proc.stdout, 'data', (data: Buffer) => stdoutBuffers.push(data));
    const stderrBuffers: Buffer[] = [];
    on(proc.stderr, 'data', (data: Buffer) => {
        if (options.mergeStdOutErr) {
            stdoutBuffers.push(data);
            stderrBuffers.push(data);
        } else {
            stderrBuffers.push(data);
        }
    });

    proc.once('close', () => {
        if (deferred.completed) {
            return;
        }
        const stderr: string | undefined =
            stderrBuffers.length === 0 ? undefined : decodeBuffer(stderrBuffers, encoding);
        if (
            stderr &&
            stderr.length > 0 &&
            options.throwOnStdErr &&
            // ignore this specific error silently; see this issue for context: https://github.com/microsoft/vscode/issues/75932
            !(PS_ERROR_SCREEN_BOGUS.test(stderr) && stderr.replace(PS_ERROR_SCREEN_BOGUS, '').trim().length === 0)
        ) {
            deferred.reject(new StdErrError(stderr));
        } else {
            let stdout = decodeBuffer(stdoutBuffers, encoding);
            stdout = filterOutputUsingCondaRunMarkers(stdout);
            deferred.resolve({ stdout, stderr });
        }
        internalDisposables.forEach((d) => d.dispose());
    });
    proc.once('error', (ex) => {
        deferred.reject(ex);
        internalDisposables.forEach((d) => d.dispose());
    });

    return deferred.promise;
}

function filterOutputUsingCondaRunMarkers(stdout: string) {
    // These markers are added if conda run is used or `interpreterInfo.py` is
    // run, see `get_output_via_markers.py`.
    const regex = />>>PYTHON-EXEC-OUTPUT([\s\S]*)<<<PYTHON-EXEC-OUTPUT/;
    const match = stdout.match(regex);
    const filteredOut = match !== null && match.length >= 2 ? match[1].trim() : undefined;
    return filteredOut !== undefined ? filteredOut : stdout;
}

export function killPid(pid: number): void {
    try {
        if (process.platform === 'win32') {
            // Windows doesn't support SIGTERM, so execute taskkill to kill the process
            execSync(`taskkill /pid ${pid} /T /F`); // NOSONAR
        } else {
            process.kill(pid);
        }
    } catch {
        // Ignore.
    }
}
