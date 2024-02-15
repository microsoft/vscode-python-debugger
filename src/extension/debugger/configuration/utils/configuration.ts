/* eslint-disable @typescript-eslint/no-explicit-any */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as path from 'path';
import * as fs from 'fs-extra';
import { MultiStepInput } from '../../../common/multiStepInput';
import { sendTelemetryEvent } from '../../../telemetry';
import { EventName } from '../../../telemetry/constants';
import { DebugConfigStrings } from '../../../common/utils/localize';
import { AttachRequestArguments } from '../../../types';
import { DebugConfigurationState, DebugConfigurationType } from '../../types';
import { WorkspaceFolder } from 'vscode';
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

async function getPossiblePaths(
    folder: WorkspaceFolder,
    globPatterns: string[],
    regex: RegExp,
): Promise<string[]> {
    const foundPathsPromises = (await Promise.allSettled(
        globPatterns.map(
            async (pattern): Promise<string[]> =>
                (await fs.pathExists(path.join(folder.uri.fsPath, pattern)))
                    ? [path.join(folder.uri.fsPath, pattern)]
                    : [],
        ),
    )) as { status: string; value: [] }[];
    const possiblePaths: string[] = [];
    foundPathsPromises.forEach((result) => possiblePaths.push(...result.value));
    const finalPaths = await asyncFilter(possiblePaths, async (possiblePath) =>
        regex.exec((await fs.readFile(possiblePath)).toString()),
    );

    return finalPaths;
}

export async function getDjangoPaths(folder: WorkspaceFolder | undefined) {
    if (!folder) {
        return undefined;
    }
    const regExpression = /execute_from_command_line\(/;
    const possiblePaths = await getPossiblePaths(
        folder,
        ['manage.py', '*/manage.py', 'app.py', '*/app.py'],
        regExpression,
    );
    return possiblePaths;
}

export async function getFastApiPaths(folder: WorkspaceFolder | undefined) {
    if (!folder) {
        return undefined;
    }
    const regExpression = /app\s*=\s*FastAPI\(/;
    const fastApiPaths = await getPossiblePaths(
        folder,
        ['main.py', 'app.py', '*/main.py', '*/app.py', '*/*/main.py', '*/*/app.py'],
        regExpression,
    );

    return fastApiPaths.length ? fastApiPaths[0] : null;
}

export async function getFlaskPaths(folder: WorkspaceFolder | undefined) {
    if (!folder) {
        return undefined;
    }
    const regExpression = /app(?:lication)?\s*=\s*(?:flask\.)?Flask\(|def\s+(?:create|make)_app\(/;
    const flaskPaths = await getPossiblePaths(
        folder,
        ['__init__.py', 'app.py', 'wsgi.py', '*/__init__.py', '*/app.py', '*/wsgi.py'],
        regExpression,
    );

    return flaskPaths.length ? flaskPaths[0] : null;
}