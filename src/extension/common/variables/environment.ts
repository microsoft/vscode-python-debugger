// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs-extra';
import * as path from 'path';
import { sendTelemetryEvent } from '../../telemetry';
import { EventName } from '../../telemetry/constants';
import { traceError } from '../log/logging';
import { getSearchPathEnvVarNames } from '../utils/exec';
import { EnvironmentVariables } from './types';

export async function parseFile(
    filePath?: string,
    baseVars?: EnvironmentVariables,
): Promise<EnvironmentVariables | undefined> {
    if (!filePath || !(await fs.pathExists(filePath))) {
        return;
    }
    const contents = await fs.readFile(filePath).catch((ex) => {
        traceError('Custom .env is likely not pointing to a valid file', ex);
        return undefined;
    });
    if (!contents) {
        return;
    }
    return parseEnvFile(contents, baseVars);
}

export function parseFileSync(filePath?: string, baseVars?: EnvironmentVariables): EnvironmentVariables | undefined {
    if (!filePath || !fs.pathExistsSync(filePath)) {
        return;
    }
    let contents: string | undefined;
    try {
        contents = fs.readFileSync(filePath, { encoding: 'utf8' });
    } catch (ex) {
        traceError('Custom .env is likely not pointing to a valid file', ex);
    }
    if (!contents) {
        return;
    }
    return parseEnvFile(contents, baseVars);
}

export function mergeVariables(
    source: EnvironmentVariables,
    target: EnvironmentVariables,
    options?: { overwrite?: boolean },
) {
    if (!target) {
        return;
    }
    const settingsNotToMerge = ['PYTHONPATH', getSearchPathEnvVarNames()[0]];
    Object.keys(source).forEach((setting) => {
        if (settingsNotToMerge.indexOf(setting) >= 0) {
            return;
        }
        if (target[setting] === undefined || options?.overwrite) {
            target[setting] = source[setting];
        }
    });
}

export function appendPythonPath(vars: EnvironmentVariables, ...pythonPaths: string[]) {
    return appendPaths(vars, 'PYTHONPATH', ...pythonPaths);
}

export function appendPath(vars: EnvironmentVariables, ...paths: string[]) {
    return appendPaths(vars, getSearchPathEnvVarNames()[0], ...paths);
}

export function appendPaths(
    vars: EnvironmentVariables,
    variableName: 'PATH' | 'Path' | 'PYTHONPATH',
    ...pathsToAppend: string[]
) {
    const valueToAppend = pathsToAppend
        .filter((item) => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
        .join(path.delimiter);
    if (valueToAppend.length === 0) {
        return vars;
    }

    const variable = vars ? vars[variableName] : undefined;
    if (variable && typeof variable === 'string' && variable.length > 0) {
        vars[variableName] = variable + path.delimiter + valueToAppend;
    } else {
        vars[variableName] = valueToAppend;
    }
    return vars;
}

export function parseEnvFile(lines: string | Buffer, baseVars?: EnvironmentVariables): EnvironmentVariables {
    const globalVars = baseVars ? baseVars : {};
    const vars: EnvironmentVariables = {};
    const content = lines.toString();
    
    // State machine to handle multiline quoted values
    let currentLine = '';
    let inQuotes = false;
    let quoteChar = '';
    let afterEquals = false;
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        
        // Track if we've seen an '=' sign (indicating we're in the value part)
        if (char === '=' && !inQuotes) {
            afterEquals = true;
            currentLine += char;
            continue;
        }
        
        // Handle quote characters - need to check for proper escaping
        if ((char === '"' || char === "'") && afterEquals) {
            // Count consecutive backslashes before this quote
            let numBackslashes = 0;
            let j = i - 1;
            while (j >= 0 && content[j] === '\\') {
                numBackslashes++;
                j--;
            }
            
            // Quote is escaped if there's an odd number of backslashes before it
            const isEscaped = numBackslashes % 2 === 1;
            
            if (!isEscaped) {
                if (!inQuotes) {
                    // Starting a quoted section
                    inQuotes = true;
                    quoteChar = char;
                } else if (char === quoteChar) {
                    // Ending a quoted section
                    inQuotes = false;
                    quoteChar = '';
                }
            }
            currentLine += char;
            continue;
        }
        
        // Handle newlines
        if (char === '\n') {
            if (inQuotes) {
                // We're inside quotes, preserve the newline
                currentLine += char;
            } else {
                // We're not in quotes, this is the end of a line
                const [name, value] = parseEnvLine(currentLine);
                if (name !== '') {
                    vars[name] = substituteEnvVars(value, vars, globalVars);
                }
                // Reset for next line
                currentLine = '';
                afterEquals = false;
            }
        } else {
            currentLine += char;
        }
    }
    
    // Handle the last line if there's no trailing newline
    if (currentLine.trim() !== '') {
        const [name, value] = parseEnvLine(currentLine);
        if (name !== '') {
            vars[name] = substituteEnvVars(value, vars, globalVars);
        }
    }
    
    return vars;
}

function parseEnvLine(line: string): [string, string] {
    // Most of the following is an adaptation of the dotenv code:
    //   https://github.com/motdotla/dotenv/blob/master/lib/main.js#L32
    // We don't use dotenv here because it loses ordering, which is
    // significant for substitution.
    // Modified to handle multiline values by using 's' flag so $ matches before newlines in multiline strings
    const match = line.match(/^\s*(_*[a-zA-Z]\w*)\s*=\s*(.*?)?\s*$/s);
    if (!match) {
        return ['', ''];
    }

    const name = match[1];
    let value = match[2];
    if (value && value !== '') {
        if (value[0] === "'" && value[value.length - 1] === "'") {
            value = value.substring(1, value.length - 1);
            value = value.replace(/\\n/gm, '\n');
        } else if (value[0] === '"' && value[value.length - 1] === '"') {
            value = value.substring(1, value.length - 1);
            value = value.replace(/\\n/gm, '\n');
        }
    } else {
        value = '';
    }

    return [name, value];
}

const SUBST_REGEX = /\${([a-zA-Z]\w*)?([^}\w].*)?}/g;

function substituteEnvVars(
    value: string,
    localVars: EnvironmentVariables,
    globalVars: EnvironmentVariables,
    missing = '',
): string {
    // Substitution here is inspired a little by dotenv-expand:
    //   https://github.com/motdotla/dotenv-expand/blob/master/lib/main.js

    let invalid = false;
    let replacement = value;
    replacement = replacement.replace(SUBST_REGEX, (match, substName, bogus, offset, orig) => {
        if (offset > 0 && orig[offset - 1] === '\\') {
            return match;
        }
        if ((bogus && bogus !== '') || !substName || substName === '') {
            invalid = true;
            return match;
        }
        return localVars[substName] || globalVars[substName] || missing;
    });
    if (!invalid && replacement !== value) {
        value = replacement;
        sendTelemetryEvent(EventName.ENVFILE_VARIABLE_SUBSTITUTION);
    }

    return value.replace(/\\\$/g, '$');
}
