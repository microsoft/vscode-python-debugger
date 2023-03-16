// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// eslint-disable-next-line max-classes-per-file
import { inject, injectable, named } from 'inversify';
import * as path from 'path';
import * as fs from 'fs-extra';
import { DiagnosticSeverity, WorkspaceFolder } from 'vscode';
import '../../../common/extensions';
import { IDisposableRegistry, Resource } from '../../../common/types';
import { Common, Diagnostics } from '../../../common/utils/localize';
import { getWorkspaceFolder, getWorkspaceFolders } from '../../../common/vscodeapi';
import { BaseDiagnostic, BaseDiagnosticsService } from '../base';
import { DiagnosticCodes } from '../constants';
import { DiagnosticCommandPromptHandlerServiceId, MessageCommandPrompt } from '../promptHandler';
import { DiagnosticScope, IDiagnostic, IDiagnosticHandlerService } from '../types';
import { IServiceContainer } from '../../../debugger/ioc/types';

const messages = {
    [DiagnosticCodes.InvalidDebuggerTypeDiagnostic]: Diagnostics.invalidDebuggerTypeDiagnostic,
    [DiagnosticCodes.JustMyCodeDiagnostic]: Diagnostics.justMyCodeDiagnostic,
    [DiagnosticCodes.ConsoleTypeDiagnostic]: Diagnostics.consoleTypeDiagnostic,
    [DiagnosticCodes.ConfigPythonPathDiagnostic]: '',
};

export class InvalidLaunchJsonDebuggerDiagnostic extends BaseDiagnostic {
    constructor(
        code:
            | DiagnosticCodes.InvalidDebuggerTypeDiagnostic
            | DiagnosticCodes.JustMyCodeDiagnostic
            | DiagnosticCodes.ConsoleTypeDiagnostic
            | DiagnosticCodes.ConfigPythonPathDiagnostic,
        resource: Resource,
        shouldShowPrompt = true,
    ) {
        super(
            code,
            messages[code],
            DiagnosticSeverity.Error,
            DiagnosticScope.WorkspaceFolder,
            resource,
            shouldShowPrompt,
        );
    }
}

export const InvalidLaunchJsonDebuggerServiceId = 'InvalidLaunchJsonDebuggerServiceId';

@injectable()
export class InvalidLaunchJsonDebuggerService extends BaseDiagnosticsService {
    constructor(
        @inject(IServiceContainer) serviceContainer: IServiceContainer,
        @inject(IDisposableRegistry) disposableRegistry: IDisposableRegistry,
        @inject(IDiagnosticHandlerService)
        @named(DiagnosticCommandPromptHandlerServiceId)
        private readonly messageService: IDiagnosticHandlerService<MessageCommandPrompt>,
    ) {
        super(
            [
                DiagnosticCodes.InvalidDebuggerTypeDiagnostic,
                DiagnosticCodes.JustMyCodeDiagnostic,
                DiagnosticCodes.ConsoleTypeDiagnostic,
                DiagnosticCodes.ConfigPythonPathDiagnostic,
            ],
            serviceContainer,
            disposableRegistry,
            true,
        );
    }

    public async diagnose(resource: Resource): Promise<IDiagnostic[]> {
        const workspaceFolders = getWorkspaceFolders();
        const hasWorkspaceFolders = (workspaceFolders?.length || 0) > 0;
        if (!hasWorkspaceFolders) {
            return [];
        }
        const workspaceFolder = resource
            ? getWorkspaceFolder(resource)!
            : workspaceFolders![0];
        return this.diagnoseWorkspace(workspaceFolder, resource);
    }

    protected async onHandle(diagnostics: IDiagnostic[]): Promise<void> {
        diagnostics.forEach((diagnostic) => this.handleDiagnostic(diagnostic));
    }

    protected async fixLaunchJson(code: DiagnosticCodes): Promise<void> {
        const workspaceFolders = getWorkspaceFolders();

        const hasWorkspaceFolders = (workspaceFolders?.length || 0) > 0;
        if (!hasWorkspaceFolders) {
            return;
        }

        await Promise.all(
            (workspaceFolders ?? []).map((workspaceFolder) =>
                this.fixLaunchJsonInWorkspace(code, workspaceFolder),
            ),
        );
    }

    private async diagnoseWorkspace(workspaceFolder: WorkspaceFolder, resource: Resource) {
        const launchJson = getLaunchJsonFile(workspaceFolder);
        if (!(await fs.exists(launchJson))) {
            return [];
        }

        const fileContents = await fs.readFile(launchJson);
        const diagnostics: IDiagnostic[] = [];
        if (fileContents.indexOf('"pythonExperimental"') > 0) {
            diagnostics.push(
                new InvalidLaunchJsonDebuggerDiagnostic(DiagnosticCodes.InvalidDebuggerTypeDiagnostic, resource),
            );
        }
        if (fileContents.indexOf('"debugStdLib"') > 0) {
            diagnostics.push(new InvalidLaunchJsonDebuggerDiagnostic(DiagnosticCodes.JustMyCodeDiagnostic, resource));
        }
        if (fileContents.indexOf('"console": "none"') > 0) {
            diagnostics.push(new InvalidLaunchJsonDebuggerDiagnostic(DiagnosticCodes.ConsoleTypeDiagnostic, resource));
        }
        if (
            fileContents.indexOf('"pythonPath":') > 0 ||
            fileContents.indexOf('{config:python.pythonPath}') > 0 ||
            fileContents.indexOf('{config:python.interpreterPath}') > 0
        ) {
            diagnostics.push(
                new InvalidLaunchJsonDebuggerDiagnostic(DiagnosticCodes.ConfigPythonPathDiagnostic, resource, false),
            );
        }
        return diagnostics;
    }

    private async handleDiagnostic(diagnostic: IDiagnostic): Promise<void> {
        if (!diagnostic.shouldShowPrompt) {
            await this.fixLaunchJson(diagnostic.code);
            return;
        }
        const commandPrompts = [
            {
                prompt: Diagnostics.yesUpdateLaunch,
                command: {
                    diagnostic,
                    invoke: async (): Promise<void> => {
                        await this.fixLaunchJson(diagnostic.code);
                    },
                },
            },
            {
                prompt: Common.noIWillDoItLater,
            },
        ];

        await this.messageService.handle(diagnostic, { commandPrompts });
    }

    private async fixLaunchJsonInWorkspace(code: DiagnosticCodes, workspaceFolder: WorkspaceFolder) {
        if ((await this.diagnoseWorkspace(workspaceFolder, undefined)).length === 0) {
            return;
        }
        const launchJson = getLaunchJsonFile(workspaceFolder);
        let fileContents = await (await fs.readFile(launchJson)).toString();
        switch (code) {
            case DiagnosticCodes.InvalidDebuggerTypeDiagnostic: {
                fileContents = findAndReplace(fileContents, '"pythonExperimental"', '"python"');
                fileContents = findAndReplace(fileContents, '"Python Experimental:', '"Python:');
                break;
            }
            case DiagnosticCodes.JustMyCodeDiagnostic: {
                fileContents = findAndReplace(fileContents, '"debugStdLib": false', '"justMyCode": true');
                fileContents = findAndReplace(fileContents, '"debugStdLib": true', '"justMyCode": false');
                break;
            }
            case DiagnosticCodes.ConsoleTypeDiagnostic: {
                fileContents = findAndReplace(fileContents, '"console": "none"', '"console": "internalConsole"');
                break;
            }
            case DiagnosticCodes.ConfigPythonPathDiagnostic: {
                fileContents = findAndReplace(fileContents, '"pythonPath":', '"python":');
                fileContents = findAndReplace(
                    fileContents,
                    '{config:python.pythonPath}',
                    '{command:python.interpreterPath}',
                );
                fileContents = findAndReplace(
                    fileContents,
                    '{config:python.interpreterPath}',
                    '{command:python.interpreterPath}',
                );
                break;
            }
            default: {
                return;
            }
        }

        await fs.writeFile(launchJson, fileContents);
    }
}

function findAndReplace(fileContents: string, search: string, replace: string) {
    const searchRegex = new RegExp(search, 'g');
    return fileContents.replace(searchRegex, replace);
}

function getLaunchJsonFile(workspaceFolder: WorkspaceFolder) {
    return path.join(workspaceFolder.uri.fsPath, '.vscode', 'launch.json');
}
