// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function ignoreErrors<T>(promise: Promise<T>) {
    return promise.catch(() => {});
}
