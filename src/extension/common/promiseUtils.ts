// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function ignoreErrors<T>(promise: Promise<T>) {
    return promise.catch(() => {});
}

// if (!String.prototype.format) {
//     String.prototype.format = function (this: string) {
//         const args = arguments;
//         return this.replace(/{(\d+)}/g, (match, number) => (args[number] === undefined ? match : args[number]));
//     };
// }
