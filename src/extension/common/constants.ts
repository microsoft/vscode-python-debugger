/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';

export const PYTHON_LANGUAGE = 'python';
const folderName = path.basename(__dirname);
export const EXTENSION_ROOT_DIR =
    folderName === 'common' ? path.dirname(path.dirname(path.dirname(__dirname))) : path.dirname(__dirname);
export const BUNDLED_PYTHON_SCRIPTS_DIR = path.join(EXTENSION_ROOT_DIR, 'bundled');
export const SERVER_SCRIPT_PATH = path.join(BUNDLED_PYTHON_SCRIPTS_DIR, 'tool', `server.py`);
export const DEBUG_SERVER_SCRIPT_PATH = path.join(BUNDLED_PYTHON_SCRIPTS_DIR, 'tool', `_debug_server.py`);

export const AppinsightsKey = '0c6ae279ed8443289764825290e4f9e2-1a736e7c-1324-4338-be46-fc2a58ae4d14-7255';

export function isTestExecution(): boolean {
    return process.env.VSC_PYTHON_CI_TEST === '1' || isUnitTestExecution();
}

/**
 * Whether we're running unit tests (*.unit.test.ts).
 * These tests have a special meaning, they run fast.
 * @export
 * @returns {boolean}
 */
export function isUnitTestExecution(): boolean {
    return process.env.VSC_PYTHON_UNIT_TEST === '1';
}

export namespace Commands {
    export const Debug_In_Terminal = 'debugpy.debugInTerminal';
    export const Debug_Using_Launch_Config = 'debugpy.debugUsingLaunchConfig';
    export const TriggerEnvironmentSelection = 'debugpy.triggerEnvSelection';
    export const PickLocalProcess = 'debugpy.pickLocalProcess';
    export const PickArguments = 'debugpy.pickArgs';
    export const ViewOutput = 'debugpy.viewOutput';
    export const ClearStorage = 'debugpy.clearCacheAndReload';
    export const Enable_SourceMap_Support = 'debugpy.enableSourceMapSupport';
    export const SelectDebugConfig = 'debugpy.SelectAndInsertDebugConfiguration';
    export const Set_Interpreter = 'python.setInterpreter';
    export const ReportIssue = 'debugpy.reportIssue';
}

export type Channel = 'stable' | 'insiders';
