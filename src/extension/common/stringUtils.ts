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
