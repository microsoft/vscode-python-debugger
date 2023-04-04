// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

export function getNamesAndValues<T>(e: any): { name: string; value: T }[] {
    return getNames(e).map((n) => ({ name: n, value: e[n] }));
}

function getNames(e: any) {
    return getObjValues(e).filter((v) => typeof v === 'string') as string[];
}

function getObjValues(e: any): (number | string)[] {
    return Object.keys(e).map((k) => e[k]);
}
