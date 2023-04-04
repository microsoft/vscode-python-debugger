/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ChildProcess, ExecOptions, SpawnOptions as ChildProcessSpawnOptions } from 'child_process';
import { Observable } from 'rxjs/Observable';
import { CancellationToken, Uri } from 'vscode';
import { IDisposable } from '../types';

export type Output<T extends string | Buffer> = {
    source: 'stdout' | 'stderr';
    out: T;
};
export type ObservableExecutionResult<T extends string | Buffer> = {
    proc: ChildProcess | undefined;
    out: Observable<Output<T>>;
    dispose(): void;
};

export type SpawnOptions = ChildProcessSpawnOptions & {
    encoding?: string;
    token?: CancellationToken;
    mergeStdOutErr?: boolean;
    throwOnStdErr?: boolean;
    extraVariables?: NodeJS.ProcessEnv;
};

export type ShellOptions = ExecOptions & { throwOnStdErr?: boolean };

export type ExecutionResult<T extends string | Buffer> = {
    stdout: T;
    stderr?: T;
};

export const IProcessLogger = Symbol('IProcessLogger');
export interface IProcessLogger {
    /**
     * Pass `args` as `undefined` if first argument is supposed to be a shell command.
     * Note it is assumed that command args are always quoted and respect
     * `String.prototype.toCommandArgument()` prototype.
     */
    logProcess(fileOrCommand: string, args?: string[], options?: SpawnOptions): void;
}

export interface IProcessService extends IDisposable {
    execObservable(file: string, args: string[], options?: SpawnOptions): ObservableExecutionResult<string>;
    exec(file: string, args: string[], options?: SpawnOptions): Promise<ExecutionResult<string>>;
    shellExec(command: string, options?: ShellOptions): Promise<ExecutionResult<string>>;
    on(event: 'exec', listener: (file: string, args: string[], options?: SpawnOptions) => void): this;
}

export const IProcessServiceFactory = Symbol('IProcessServiceFactory');

export interface IProcessServiceFactory {
    create(resource?: Uri): Promise<IProcessService>;
}
export class StdErrError extends Error {
    constructor(message: string) {
        super(message);
    }
}
