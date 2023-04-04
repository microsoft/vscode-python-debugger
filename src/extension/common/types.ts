/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import {
    ExtensionContext,
    Memento,
    Uri,
} from 'vscode';
import { EnvironmentVariables } from './variables/types';

export interface IDisposable {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispose(): void | undefined | Promise<void>;
}

export const IDisposableRegistry = Symbol('IDisposableRegistry');
export type IDisposableRegistry = IDisposable[];
export const IMemento = Symbol('IGlobalMemento');
export const GLOBAL_MEMENTO = Symbol('IGlobalMemento');
export const WORKSPACE_MEMENTO = Symbol('IWorkspaceMemento');

export type Resource = Uri | undefined;

export interface IPersistentState<T> {
    /**
     * Storage is exposed in this type to make sure folks always use persistent state
     * factory to access any type of storage as all storages are tracked there.
     */
    readonly storage: Memento;
    readonly value: T;
    updateValue(value: T): Promise<void>;
}

export const IPersistentStateFactory = Symbol('IPersistentStateFactory');

export interface IPersistentStateFactory {
    createGlobalPersistentState<T>(key: string, defaultValue?: T, expiryDurationMs?: number): IPersistentState<T>;
    createWorkspacePersistentState<T>(key: string, defaultValue?: T, expiryDurationMs?: number): IPersistentState<T>;
}

export const ICurrentProcess = Symbol('ICurrentProcess');
export interface ICurrentProcess {
    readonly env: EnvironmentVariables;
    readonly argv: string[];
    readonly stdout: NodeJS.WriteStream;
    readonly stdin: NodeJS.ReadStream;
    readonly execPath: string;
    // eslint-disable-next-line @typescript-eslint/ban-types
    on(event: string | symbol, listener: Function): this;
}

export interface IExperiments {
    /**
     * Return `true` if experiments are enabled, else `false`.
     */
    readonly enabled: boolean;
    /**
     * Experiments user requested to opt into manually
     */
    readonly optInto: string[];
    /**
     * Experiments user requested to opt out from manually
     */
    readonly optOutFrom: string[];
}

export interface IAutoCompleteSettings {
    readonly extraPaths: string[];
}

export const IExtensionContext = Symbol('ExtensionContext');
export interface IExtensionContext extends ExtensionContext {}
