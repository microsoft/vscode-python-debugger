/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { ExtensionContext, Memento } from 'vscode';

export interface IDisposable {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispose(): void | undefined | Promise<void>;
}

export const IDisposableRegistry = Symbol('IDisposableRegistry');
export type IDisposableRegistry = IDisposable[];

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

export const IExtensionContext = Symbol('ExtensionContext');
export interface IExtensionContext extends ExtensionContext {}
