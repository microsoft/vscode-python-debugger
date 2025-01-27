// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { DebugSessionOptions, Disposable, GlobalEnvironmentVariableCollection, l10n, RelativePattern } from 'vscode';
import { createFileSystemWatcher, debugStartDebugging } from './utils';
import { traceError, traceLog, traceVerbose } from './common/log/logging';

/**
 * Registers the configuration-less debugging setup for the extension.
 *
 * This function sets up environment variables and a file system watcher to
 * facilitate debugging without requiring a pre-configured launch.json file.
 *
 * @param envVarCollection - The collection of environment variables to be modified.
 * @param extPath - The path to the extension directory.
 *
 * Environment Variables:
 * - `DEBUGPY_ADAPTER_ENDPOINTS`: Path to the file containing the debugger adapter endpoint.
 * - `BUNDLED_DEBUGPY_PATH`: Path to the bundled debugpy library.
 * - `PATH`: Appends the path to the noConfigScripts directory.
 */
export async function registerNoConfigDebug(
    envVarCollection: GlobalEnvironmentVariableCollection,
    extPath: string,
): Promise<Disposable> {
    const collection = envVarCollection;

    // create a temp directory for the noConfigDebugAdapterEndpoints
    // file path format: tempDir/noConfigDebugAdapterEndpoints-<randomString>/debuggerAdapterEndpoint.txt
    const randomSuffix = crypto.randomBytes(10).toString('hex');
    const tempDirName = `noConfigDebugAdapterEndpoints-${randomSuffix}`;
    let tempDirPath = path.join(os.tmpdir(), tempDirName);
    try {
        traceLog('Attempting to use temp directory for noConfigDebugAdapterEndpoints, dir name:', tempDirName);
        await fs.promises.mkdir(tempDirPath, { recursive: true });
    } catch (error) {
        // Handle the error when accessing the temp directory
        traceError('Error accessing temp directory:', error, ' Attempt to use extension root dir instead');
        // Make new temp directory in extension root dird
        tempDirPath = path.join(extPath, '.temp');
        await fs.promises.mkdir(tempDirPath, { recursive: true });
    }
    const tempFilePath = path.join(tempDirPath, 'debuggerAdapterEndpoint.txt');

    // Add env var for PYDEVD_DISABLE_FILE_VALIDATION to disable extra output in terminal when starting the debug session.
    collection.replace('PYDEVD_DISABLE_FILE_VALIDATION', '1');

    // Add env vars for DEBUGPY_ADAPTER_ENDPOINTS, BUNDLED_DEBUGPY_PATH, and PATH
    collection.replace('DEBUGPY_ADAPTER_ENDPOINTS', tempFilePath);

    const noConfigScriptsDir = path.join(extPath, 'bundled', 'scripts', 'noConfigScripts');
    const pathSeparator = process.platform === 'win32' ? ';' : ':';
    collection.append('PATH', `${pathSeparator}${noConfigScriptsDir}`);

    const bundledDebugPath = path.join(extPath, 'bundled', 'libs', 'debugpy');
    collection.replace('BUNDLED_DEBUGPY_PATH', bundledDebugPath);

    envVarCollection.description = l10n.t(
        'Enables use of [no-config debugging](https://github.com/microsoft/vscode-python-debugger/wiki/No%E2%80%90Config-Debugging), `debugpy <script.py>`, in the terminal.',
    );

    // create file system watcher for the debuggerAdapterEndpointFolder for when the communication port is written
    const fileSystemWatcher = createFileSystemWatcher(new RelativePattern(tempDirPath, '**/*'));
    const fileCreationEvent = fileSystemWatcher.onDidCreate(async (uri) => {
        const filePath = uri.fsPath;
        fs.readFile(filePath, (err, data) => {
            const dataParse = data.toString();
            if (err) {
                traceError(`Error reading debuggerAdapterEndpoint.txt file: ${err}`);
                return;
            }
            try {
                // parse the client port
                const jsonData = JSON.parse(dataParse);
                const clientPort = jsonData.client?.port;
                traceVerbose(`Parsed client port: ${clientPort}`);

                const options: DebugSessionOptions = {
                    noDebug: false,
                };

                // start debug session with the client port
                debugStartDebugging(
                    undefined,
                    {
                        type: 'python',
                        request: 'attach',
                        name: 'Attach to Python',
                        connect: {
                            port: clientPort,
                            host: 'localhost',
                        },
                    },
                    options,
                ).then(
                    (started) => {
                        if (started) {
                            traceVerbose('Successfully started debug session');
                        } else {
                            traceError('Error starting debug session, session not started.');
                        }
                    },
                    (error) => {
                        traceError(`Error starting debug session: ${error}`);
                    },
                );
            } catch (parseErr) {
                traceError(`Error parsing JSON: ${parseErr}`);
            }
        });
        JSON.parse;
    });
    return Promise.resolve(
        new Disposable(() => {
            fileSystemWatcher.dispose();
            fileCreationEvent.dispose();
        }),
    );
}
