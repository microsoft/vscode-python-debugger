// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

// Deferred

export interface Deferred<T> {
    readonly promise: Promise<T>;
    readonly resolved: boolean;
    readonly rejected: boolean;
    readonly completed: boolean;
    resolve(value?: T | PromiseLike<T>): void;
    reject(reason?: string | Error | Record<string, unknown> | unknown): void;
}

class DeferredImpl<T> implements Deferred<T> {
    private _resolve!: (value: T | PromiseLike<T>) => void;

    private _reject!: (reason?: string | Error | Record<string, unknown>) => void;

    private _resolved = false;

    private _rejected = false;

    private _promise: Promise<T>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(private scope: any = null) {
        this._promise = new Promise<T>((res, rej) => {
            this._resolve = res;
            this._reject = rej;
        });
    }

    public resolve(_value: T | PromiseLike<T>) {
        this._resolve.apply(this.scope ? this.scope : this, [_value]);
        this._resolved = true;
    }

    public reject(_reason?: string | Error | Record<string, unknown>) {
        this._reject.apply(this.scope ? this.scope : this, [_reason]);
        this._rejected = true;
    }

    get promise(): Promise<T> {
        return this._promise;
    }

    get resolved(): boolean {
        return this._resolved;
    }

    get rejected(): boolean {
        return this._rejected;
    }

    get completed(): boolean {
        return this._rejected || this._resolved;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function createDeferred<T = void>(scope: any = null): Deferred<T> {
    return new DeferredImpl<T>(scope);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function isPromise<T>(v: any): v is Promise<T> {
    return typeof v?.then === 'function' && typeof v?.catch === 'function';
}
