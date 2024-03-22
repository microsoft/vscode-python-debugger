/* eslint-disable @typescript-eslint/no-explicit-any */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as fs from 'fs-extra';
import { MultiStepInput } from '../../../common/multiStepInput';
import { sendTelemetryEvent } from '../../../telemetry';
import { EventName } from '../../../telemetry/constants';
import { DebugConfigStrings } from '../../../common/utils/localize';
import { AttachRequestArguments } from '../../../types';
import { DebugConfigurationState, DebugConfigurationType } from '../../types';
import { Uri, WorkspaceFolder, workspace } from 'vscode';
import { asyncFilter } from '../../../common/utilities';

const defaultPort = 5678;

export async function configurePort(
    input: MultiStepInput<DebugConfigurationState>,
    config: Partial<AttachRequestArguments>,
): Promise<void> {
    const connect = config.connect || (config.connect = {});
    const port = await input.showInputBox({
        title: DebugConfigStrings.attach.enterRemotePort.title,
        step: 2,
        totalSteps: 2,
        value: (connect.port || defaultPort).toString(),
        prompt: DebugConfigStrings.attach.enterRemotePort.prompt,
        validate: (value) =>
            Promise.resolve(
                value && /^\d+$/.test(value.trim()) ? undefined : DebugConfigStrings.attach.enterRemotePort.invalid,
            ),
    });
    if (port && /^\d+$/.test(port.trim())) {
        connect.port = parseInt(port, 10);
    }
    if (!connect.port) {
        connect.port = defaultPort;
    }
    sendTelemetryEvent(EventName.DEBUGGER_CONFIGURATION_PROMPTS, undefined, {
        configurationType: DebugConfigurationType.remoteAttach,
        manuallyEnteredAValue: connect.port !== defaultPort,
    });
}

async function getPossiblePaths(globPatterns: string[], regex: RegExp): Promise<Uri[]> {
    const foundPathsPromises = (await Promise.allSettled(
        globPatterns.map(async (pattern): Promise<Uri[]> => await workspace.findFiles(pattern)),
    )) as { status: string; value: [] }[];
    const possiblePaths: Uri[] = [];
    foundPathsPromises.forEach((result) => possiblePaths.push(...result.value));
    const finalPaths = await asyncFilter(possiblePaths, async (possiblePath) =>
        regex.exec((await fs.readFile(possiblePath.fsPath)).toString()),
    );

    return finalPaths;
}

export async function getDjangoPaths(folder: WorkspaceFolder | undefined): Promise<Uri[]> {
    if (!folder) {
        return [];
    }
    const regExpression = /execute_from_command_line\(/;
    const djangoPaths = await getPossiblePaths(['manage.py', '*/manage.py', 'app.py', '*/app.py'], regExpression);
    return djangoPaths;
}

export async function getFastApiPaths(folder: WorkspaceFolder | undefined) {
    if (!folder) {
        return [];
    }
    const regExpression = /app\s*=\s*FastAPI\(/;
    const fastApiPaths = await getPossiblePaths(
        ['main.py', 'app.py', '*/main.py', '*/app.py', '*/*/main.py', '*/*/app.py'],
        regExpression,
    );

    return fastApiPaths;
}

export async function getFlaskPaths(folder: WorkspaceFolder | undefined) {
    if (!folder) {
        return [];
    }
    const regExpression = /app(?:lication)?\s*=\s*(?:flask\.)?Flask\(|def\s+(?:create|make)_app\(/;
    const flaskPaths = await getPossiblePaths(
        ['__init__.py', 'app.py', 'wsgi.py', '*/__init__.py', '*/app.py', '*/wsgi.py'],
        regExpression,
    );

    return flaskPaths;
}
