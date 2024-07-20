/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as path from 'path';
import { CancellationToken, DebugConfiguration, WorkspaceFolder } from 'vscode';
import { IDynamicDebugConfigurationService } from '../types';
import { DebuggerTypeName } from '../../constants';
import { replaceAll } from '../../common/stringUtils';
import { getDjangoPaths, getFastApiPaths, getFlaskPaths } from './utils/configuration';
import { sendTelemetryEvent } from '../../telemetry';
import { EventName } from '../../telemetry/constants';

const workspaceFolderToken = '${workspaceFolder}';

export class DynamicPythonDebugConfigurationService implements IDynamicDebugConfigurationService {
    // eslint-disable-next-line class-methods-use-this
    public async provideDebugConfigurations(
        folder: WorkspaceFolder,
        _token?: CancellationToken,
    ): Promise<DebugConfiguration[] | undefined> {
        const providers = [];

        providers.push({
            name: 'Python Debugger: Python File',
            type: DebuggerTypeName,
            request: 'launch',
            program: '${file}',
        });

        const djangoManagePaths = await getDjangoPaths(folder);
        const djangoManagePath = djangoManagePaths?.length
            ? path.relative(folder.uri.fsPath, djangoManagePaths[0].fsPath)
            : null;
        if (djangoManagePath) {
            providers.push({
                name: 'Python Debugger: Django',
                type: DebuggerTypeName,
                request: 'launch',
                program: `${workspaceFolderToken}${path.sep}${djangoManagePath}`,
                args: ['runserver'],
                django: true,
            });
        }

        const flaskPaths = await getFlaskPaths(folder);
        const flaskPath = flaskPaths?.length ? flaskPaths[0].fsPath : null;
        if (flaskPath) {
            providers.push({
                name: 'Python Debugger: Flask',
                type: DebuggerTypeName,
                request: 'launch',
                module: 'flask',
                env: {
                    FLASK_APP: path.relative(folder.uri.fsPath, flaskPath),
                    FLASK_DEBUG: '1',
                },
                args: ['run', '--no-debugger', '--no-reload'],
                jinja: true,
            });
        }

        const fastApiPaths = await getFastApiPaths(folder);
        let fastApiPath = fastApiPaths?.length ? fastApiPaths[0].fsPath : null;
        if (fastApiPath) {
            fastApiPath = replaceAll(path.relative(folder.uri.fsPath, fastApiPath), path.sep, '.').replace('.py', '');
            providers.push({
                name: 'Python Debugger: FastAPI',
                type: DebuggerTypeName,
                request: 'launch',
                module: 'uvicorn',
                args: [`${fastApiPath}:app`, '--reload'],
                jinja: true,
            });
        }

        sendTelemetryEvent(EventName.DEBUGGER_DYNAMIC_CONFIGURATION, undefined, { providers: providers });

        return providers;
    }
}
