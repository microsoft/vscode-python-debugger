// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type EnvironmentVariables = Object & Record<string, string | undefined>;

export const IEnvironmentVariablesService = Symbol('IEnvironmentVariablesService');

export interface IEnvironmentVariablesService {
    parseFile(filePath?: string, baseVars?: EnvironmentVariables): Promise<EnvironmentVariables | undefined>;
    parseFileSync(filePath?: string, baseVars?: EnvironmentVariables): EnvironmentVariables | undefined;
    mergeVariables(source: EnvironmentVariables, target: EnvironmentVariables, options?: { overwrite?: boolean }): void;
    appendPythonPath(vars: EnvironmentVariables, ...pythonPaths: string[]): void;
    appendPath(vars: EnvironmentVariables, ...paths: string[]): void;
}