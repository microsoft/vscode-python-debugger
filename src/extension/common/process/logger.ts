// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { Logging } from '../utils/localize';
import { SpawnOptions } from './types';
import { escapeRegExp } from 'lodash';
import { traceLog } from '../log/logging';
import { getWorkspaceFolders } from '../vscodeapi';
import { getOSType, getUserHomeDir, OSType } from '../platform';
import { replaceAll, toCommandArgumentForPythonExt, trimQuotes } from '../stringUtils';

export function logProcess(fileOrCommand: string, args?: string[], options?: SpawnOptions) {
    let command = args
        ? [fileOrCommand, ...args].map((e) => toCommandArgumentForPythonExt(trimQuotes(e))).join(' ')
        : fileOrCommand;
    const info = [`> ${getDisplayCommands(command)}`];
    if (options && options.cwd) {
        info.push(`${Logging.currentWorkingDirectory} ${getDisplayCommands(options.cwd as string)}`);
    }

    info.forEach((line) => {
        traceLog(line);
    });
}

function getDisplayCommands(command: string): string {
    const workspaceFolders = getWorkspaceFolders();
    if (workspaceFolders && workspaceFolders.length === 1) {
        command = replaceMatchesWithCharacter(command, workspaceFolders[0].uri.fsPath, '.');
    }
    const home = getUserHomeDir();
    if (home) {
        command = replaceMatchesWithCharacter(command, home, '~');
    }
    return command;
}

/**
 * Finds case insensitive matches in the original string and replaces it with character provided.
 */
function replaceMatchesWithCharacter(original: string, match: string, character: string): string {
    // Backslashes, plus signs, brackets and other characters have special meaning in regexes,
    // we need to escape using an extra backlash so it's not considered special.
    function getRegex(match: string) {
        let pattern = escapeRegExp(match);
        if (getOSType() === OSType.Windows) {
            // Match both forward and backward slash versions of 'match' for Windows.
            pattern = replaceAll(pattern, '\\\\', '(\\\\|/)');
        }
        let regex = new RegExp(pattern, 'ig');
        return regex;
    }

    function isPrevioustoMatchRegexALetter(chunk: string, index: number) {
        return chunk[index].match(/[a-z]/);
    }

    let chunked = original.split(' ');

    for (let i = 0; i < chunked.length; i++) {
        let regex = getRegex(match);
        const regexResult = regex.exec(chunked[i]);
        if (regexResult) {
            const regexIndex = regexResult.index;
            if (regexIndex > 0 && isPrevioustoMatchRegexALetter(chunked[i], regexIndex - 1)) {
                regex = getRegex(match.substring(1));
            }
            chunked[i] = chunked[i].replace(regex, character);
        }
    }
    return chunked.join(' ');
}
