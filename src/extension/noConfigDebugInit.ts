import * as fs from 'fs';
import * as path from 'path';
import { IExtensionContext } from './common/types';
import { DebugSessionOptions, RelativePattern } from 'vscode';
import { createFileSystemWatcher, debugStartDebugging } from './utils';
import { traceError, traceVerbose } from './common/log/logging';

/**
 * Registers the configuration-less debugging setup for the extension.
 *
 * This function sets up environment variables and a file system watcher to
 * facilitate debugging without requiring a pre-configured launch.json file.
 *
 * @param context - The extension context which provides access to the environment variable collection and subscriptions.
 *
 * Environment Variables:
 * - `DEBUGPY_ADAPTER_ENDPOINTS`: Path to the file containing the debugger adapter endpoint.
 * - `BUNDLED_DEBUGPY_PATH`: Path to the bundled debugpy library.
 * - `PATH`: Appends the path to the noConfigScripts directory.
 */
export async function registerNoConfigDebug(context: IExtensionContext): Promise<void> {
    const collection = context.environmentVariableCollection;

    // Add env vars for DEBUGPY_ADAPTER_ENDPOINTS, BUNDLED_DEBUGPY_PATH, and PATH
    const debugAdapterEndpointDir = path.join(context.extensionPath, 'noConfigDebugAdapterEndpoints');
    const debuggerAdapterEndpointPath = path.join(debugAdapterEndpointDir, 'debuggerAdapterEndpoint.txt');
    collection.replace('DEBUGPY_ADAPTER_ENDPOINTS', debuggerAdapterEndpointPath);

    const noConfigScriptsDir = path.join(context.extensionPath, 'bundled/scripts/noConfigScripts');
    collection.append('PATH', `:${noConfigScriptsDir}`);

    const bundledDebugPath = path.join(context.extensionPath, 'bundled/libs/debugpy');
    collection.replace('BUNDLED_DEBUGPY_PATH', bundledDebugPath);

    // create file system watcher for the debuggerAdapterEndpointFolder for when the communication port is written
    context.subscriptions.push(
        createFileSystemWatcher(new RelativePattern(debugAdapterEndpointDir, '**/*')).onDidCreate((uri) => {
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
                            port: clientPort,
                            host: 'localhost',
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
        }),
    );
}
