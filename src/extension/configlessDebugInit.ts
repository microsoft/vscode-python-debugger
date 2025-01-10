import * as fs from 'fs';
import * as path from 'path';
import { IExtensionContext } from './common/types';
import { DebugSessionOptions, debug, RelativePattern, workspace } from 'vscode';

const PATH_VARIABLE = 'PATH';

export async function registerConfiglessDebug(context: IExtensionContext): Promise<void> {
    const collection = context.environmentVariableCollection;
    // constants
    const debuggerAdapterEndpointFolderPath = path.join(context.extensionPath, 'src/extension/configlessCommunication');
    const debuggerAdapterEndpointPath = path.join(debuggerAdapterEndpointFolderPath, 'debuggerAdapterEndpoint.txt');

    // Add env vars for DEBUGPY_ADAPTER_ENDPOINTS and PATH
    collection.replace('DEBUGPY_ADAPTER_ENDPOINTS', debuggerAdapterEndpointPath);
    // TODO: append for path

    // const pathVariableChange = path.delimiter + '/Users/eleanorboyd/vscode-python-debugger';
    // if (context.environmentVariableCollection.get(PATH_VARIABLE)) {
    //     context.environmentVariableCollection.delete(PATH_VARIABLE);
    // } else if (context.environmentVariableCollection.get(PATH_VARIABLE)?.value !== pathVariableChange) {
    //     context.environmentVariableCollection.description = 'enable config-less debug';
    //     context.environmentVariableCollection.delete(PATH_VARIABLE);
    //     context.environmentVariableCollection.append(PATH_VARIABLE, pathVariableChange);
    // }

    // create file system watcher for the debuggerAdapterEndpointFolder for when the communication port is written
    context.subscriptions.push(
        workspace
            .createFileSystemWatcher(new RelativePattern(debuggerAdapterEndpointFolderPath, '**/*'))
            .onDidCreate((uri) => {
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
