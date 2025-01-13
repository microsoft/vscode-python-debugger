import * as fs from 'fs';
import * as path from 'path';
import { IExtensionContext } from './common/types';
import { DebugSessionOptions, debug, RelativePattern, workspace } from 'vscode';

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
export async function registerConfiglessDebug(context: IExtensionContext): Promise<void> {
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
        workspace.createFileSystemWatcher(new RelativePattern(debugAdapterEndpointDir, '**/*')).onDidCreate((uri) => {
            console.log(`File created: ${uri.fsPath}`);
            const filePath = uri.fsPath;
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    console.error(`Error reading file: ${err}`);
                    return;
                }
                try {
                    // parse the client port
                    const jsonData = JSON.parse(data);
                    const clientPort = jsonData.client?.port;
                    console.log(`Client port: ${clientPort}`);

                    const options: DebugSessionOptions = {
                        noDebug: false,
                    };

                    // start debug session with the client port
                    debug
                        .startDebugging(
                            undefined,
                            {
                                type: 'python',
                                request: 'attach',
                                name: 'Attach to Python',
                                port: clientPort,
                                host: 'localhost',
                            },
                            options,
                        )
                        .then(
                            (started) => {
                                if (started) {
                                    console.log('Debug session started successfully');
                                } else {
                                    console.error('Failed to start debug session');
                                }
                            },
                            (error) => {
                                console.error(`Error starting debug session: ${error}`);
                            },
                        );
                } catch (parseErr) {
                    console.error(`Error parsing JSON: ${parseErr}`);
                }
            });
            JSON.parse;
        }),
    );
}
