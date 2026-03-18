// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Extension, extensions } from 'vscode';
import { getConfiguration } from './vscodeapi';

/**
 * Returns the elements of an array that meet the condition specified in an async callback function.
 * @param asyncPredicate The filter method calls the async predicate function one time for each element in the array.
 */
export async function asyncFilter<T>(arr: T[], asyncPredicate: (value: T) => Promise<unknown>): Promise<T[]> {
    const results = await Promise.all(arr.map(asyncPredicate));
    return arr.filter((_v, index) => results[index]);
}

export function getExtension<T = unknown>(extensionId: string): Extension<T> | undefined {
    return extensions.getExtension(extensionId);
}
let _useExt: boolean | undefined;
export const ENVS_EXTENSION_ID = 'ms-python.vscode-python-envs';

export function useEnvExtension(): boolean {
    if (_useExt !== undefined) {
        return _useExt;
    }
    const inExpSetting = getConfiguration('python').get<boolean>('useEnvironmentsExtension', false);

    // If extension is installed and in experiment, then use it.
    _useExt = !!getExtension(ENVS_EXTENSION_ID) && inExpSetting;
    return _useExt;
}
