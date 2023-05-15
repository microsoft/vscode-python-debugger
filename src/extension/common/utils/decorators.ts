// import '../../common/extensions';

import { isTestExecution } from '../constants';
import { traceError, traceVerbose } from '../log/logging';
import { ignoreErrors } from '../promiseUtils';
import { getCacheKeyFromFunctionArgs, getGlobalCacheStore } from './cacheUtils';
import { StopWatch } from './stopWatch';

/**
 * Swallows exceptions thrown by a function. Function must return either a void or a promise that resolves to a void.
 * When exceptions (including in promises) are caught, this will return `undefined` to calling code.
 * @export
 * @param {string} [scopeName] Scope for the error message to be logged along with the error.
 * @returns void
 */
export function swallowExceptions(scopeName?: string) {
    return function (_target: any, propertyName: string, descriptor: TypedPropertyDescriptor<any>) {
        const originalMethod = descriptor.value!;
        const errorMessage = `Python Extension (Error in ${scopeName || propertyName}, method:${propertyName}):`;

        descriptor.value = function (...args: any[]) {
            try {
                const result = originalMethod.apply(this, args);

                // If method being wrapped returns a promise then wait and swallow errors.
                if (result && typeof result.then === 'function' && typeof result.catch === 'function') {
                    return (result as Promise<void>).catch((error) => {
                        if (isTestExecution()) {
                            return;
                        }
                        traceError(errorMessage, error);
                    });
                }
            } catch (error) {
                if (isTestExecution()) {
                    return;
                }
                traceError(errorMessage, error);
            }
        };
    };
}

type PromiseFunctionWithAnyArgs = (...any: any) => Promise<any>;
const cacheStoreForMethods = getGlobalCacheStore();

/**
 * Extension start up time is considered the duration until extension is likely to keep running commands in background.
 * It is observed on CI it can take upto 3 minutes, so this is an intelligent guess.
 */
const extensionStartUpTime = 200_000;

/**
 * Tracks the time since the module was loaded. For caching purposes, we consider this time to approximately signify
 * how long extension has been active.
 */
const moduleLoadWatch = new StopWatch();

/**
 * Caches function value until a specific duration.
 * @param expiryDurationMs Duration to cache the result for. If set as '-1', the cache will never expire for the session.
 * @param cachePromise If true, cache the promise instead of the promise result.
 * @param expiryDurationAfterStartUpMs If specified, this is the duration to cache the result for after extension startup (until extension is likely to
 * keep running commands in background)
 */
export function cache(expiryDurationMs: number, cachePromise = false, expiryDurationAfterStartUpMs?: number) {
    return function (
        target: Object,
        propertyName: string,
        descriptor: TypedPropertyDescriptor<PromiseFunctionWithAnyArgs>,
    ) {
        const originalMethod = descriptor.value!;
        const className = 'constructor' in target && target.constructor.name ? target.constructor.name : '';
        const keyPrefix = `Cache_Method_Output_${className}.${propertyName}`;
        descriptor.value = async function (...args: any) {
            if (isTestExecution()) {
                return originalMethod.apply(this, args) as Promise<any>;
            }
            let key: string;
            try {
                key = getCacheKeyFromFunctionArgs(keyPrefix, args);
            } catch (ex) {
                traceError('Error while creating key for keyPrefix:', keyPrefix, ex);
                return originalMethod.apply(this, args) as Promise<any>;
            }
            const cachedItem = cacheStoreForMethods.get(key);
            if (cachedItem && (cachedItem.expiry > Date.now() || expiryDurationMs === -1)) {
                traceVerbose(`Cached data exists ${key}`);
                return Promise.resolve(cachedItem.data);
            }
            const expiryMs =
                expiryDurationAfterStartUpMs && moduleLoadWatch.elapsedTime > extensionStartUpTime
                    ? expiryDurationAfterStartUpMs
                    : expiryDurationMs;
            const promise = originalMethod.apply(this, args) as Promise<any>;
            if (cachePromise) {
                cacheStoreForMethods.set(key, { data: promise, expiry: Date.now() + expiryMs });
            } else {
                ignoreErrors(
                    promise.then((result) =>
                        cacheStoreForMethods.set(key, { data: result, expiry: Date.now() + expiryMs }),
                    ),
                );
            }
            return promise;
        };
    };
}
