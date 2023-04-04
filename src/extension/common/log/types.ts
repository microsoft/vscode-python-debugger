/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type Arguments = unknown[];

export interface ILogging {
    traceLog(...data: Arguments): void;
    traceError(...data: Arguments): void;
    traceWarn(...data: Arguments): void;
    traceInfo(...data: Arguments): void;
    traceVerbose(...data: Arguments): void;
}

export type LoggingLevelSettingType = 'off' | 'error' | 'warn' | 'info' | 'debug';
export enum LogLevel {
    off = 0,
    error = 10,
    warn = 20,
    info = 30,
    debug = 40,
}

export type TraceDecoratorType = (
    _: Object,
    __: string,
    descriptor: TypedPropertyDescriptor<any>,
) => TypedPropertyDescriptor<any>;

// The information we want to log.
export enum TraceOptions {
    None = 0,
    Arguments = 1,
    ReturnValue = 2,
}
