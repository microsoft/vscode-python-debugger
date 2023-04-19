// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Replaces all instances of a substring with a new substring.
 */
export function replaceAll(source: string, substr: string, newSubstr: string): string {
    if (!source) {
        return source;
    }

    /** Escaping function from the MDN web docs site
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
     * Escapes all the following special characters in a string . * + ? ^ $ { } ( ) | \ \\
     */

    function escapeRegExp(unescapedStr: string): string {
        return unescapedStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    return source.replace(new RegExp(escapeRegExp(substr), 'g'), newSubstr);
}

/**
 * Removes leading and trailing quotes from a string
 */
export function trimQuotes(source: string): string {
    if (!source) {
        return source;
    }
    return source.replace(/(^['"])|(['"]$)/g, '');
}

/**
 * Appropriately formats a string so it can be used as an argument for a command in a shell.
 * E.g. if an argument contains a space, then it will be enclosed within double quotes.
 * @param {String} value.
 */
export function toCommandArgumentForPythonExt(source: string): string {
    if (!source) {
        return source;
    }
    return (source.indexOf(' ') >= 0 ||
        source.indexOf('&') >= 0 ||
        source.indexOf('(') >= 0 ||
        source.indexOf(')') >= 0) &&
        !source.startsWith('"') &&
        !source.endsWith('"')
        ? `"${source}"`
        : source.toString();
}

/**
 * Appropriately formats a a file path so it can be used as an argument for a command in a shell.
 * E.g. if an argument contains a space, then it will be enclosed within double quotes.
 */
export function fileToCommandArgumentForPythonExt(source: string): string {
    if (!source) {
        return source;
    }
    return toCommandArgumentForPythonExt(source).replace(/\\/g, '/');
}
