// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as path from 'path';
import { inject, injectable, multiInject } from 'inversify';
import { TextDocument, workspace } from 'vscode';
import { IApplicationDiagnostics } from '../application/types';
import { PYTHON_LANGUAGE } from '../common/constants';
import { traceDecoratorError } from '../common/log/logging';
import { getOSType, OSType } from '../common/platform';
import { IDisposable, Resource } from '../common/types';
import { Deferred } from '../common/utils/async';
import { getWorkspaceFolder, getWorkspaceFolders, isVirtualWorkspace } from '../common/vscodeapi';
import { IExtensionActivationManager, IExtensionSingleActivationService } from './types';

@injectable()
export class ExtensionActivationManager implements IExtensionActivationManager {
    public readonly activatedWorkspaces = new Set<string>();

    protected readonly isInterpreterSetForWorkspacePromises = new Map<string, Deferred<void>>();

    private readonly disposables: IDisposable[] = [];

    private docOpenedHandler?: IDisposable;

    constructor(
        @multiInject(IExtensionSingleActivationService)
        private singleActivationServices: IExtensionSingleActivationService[],
        @inject(IApplicationDiagnostics) private readonly appDiagnostics: IApplicationDiagnostics,
    ) {}

    private filterServices() {
        if (!workspace.isTrusted) {
            this.singleActivationServices = this.singleActivationServices.filter(
                (service) => service.supportedWorkspaceTypes.untrustedWorkspace,
            );
        }
        if (isVirtualWorkspace()) {
            this.singleActivationServices = this.singleActivationServices.filter(
                (service) => service.supportedWorkspaceTypes.virtualWorkspace,
            );
        }
    }

    public dispose(): void {
        while (this.disposables.length > 0) {
            const disposable = this.disposables.shift()!;
            disposable.dispose();
        }
        if (this.docOpenedHandler) {
            this.docOpenedHandler.dispose();
            this.docOpenedHandler = undefined;
        }
    }

    public async activate(): Promise<void> {
        this.filterServices();
        await this.initialize();

        // Activate all activation services together.

        await Promise.all([...this.singleActivationServices.map((item) => item.activate())]);
    }

    @traceDecoratorError('Failed to activate a workspace')
    public async activateWorkspace(resource: Resource): Promise<void> {
        const key = this.getWorkspaceKey(resource);
        if (this.activatedWorkspaces.has(key)) {
            return;
        }
        this.activatedWorkspaces.add(key);
        await this.appDiagnostics.performPreStartupHealthCheck(resource);
    }

    public async initialize(): Promise<void> {
        this.addHandlers();
        this.addRemoveDocOpenedHandlers();
    }

    public onDocOpened(doc: TextDocument): void {
        if (doc.languageId !== PYTHON_LANGUAGE) {
            return;
        }
        const key = this.getWorkspaceKey(doc.uri);
        const hasWorkspaceFolders = (getWorkspaceFolders()?.length || 0) > 0;
        // If we have opened a doc that does not belong to workspace, then do nothing.
        if (key === '' && hasWorkspaceFolders) {
            return;
        }
        if (this.activatedWorkspaces.has(key)) {
            return;
        }
        const folder = getWorkspaceFolder(doc.uri);
        this.activateWorkspace(folder ? folder.uri : undefined).ignoreErrors();
    }

    protected addHandlers(): void {
        this.disposables.push(workspace.onDidChangeWorkspaceFolders(this.onWorkspaceFoldersChanged, this));
    }

    protected addRemoveDocOpenedHandlers(): void {
        if (this.hasMultipleWorkspaces()) {
            if (!this.docOpenedHandler) {
                this.docOpenedHandler = workspace.onDidOpenTextDocument(this.onDocOpened, this);
            }
            return;
        }
        if (this.docOpenedHandler) {
            this.docOpenedHandler.dispose();
            this.docOpenedHandler = undefined;
        }
    }

    protected onWorkspaceFoldersChanged(): void {
        // If an activated workspace folder was removed, delete its key
        const workspaceKeys = getWorkspaceFolders()!.map((workspaceFolder) =>
            this.getWorkspaceKey(workspaceFolder.uri),
        );
        const activatedWkspcKeys = Array.from(this.activatedWorkspaces.keys());
        const activatedWkspcFoldersRemoved = activatedWkspcKeys.filter((item) => workspaceKeys.indexOf(item) < 0);
        if (activatedWkspcFoldersRemoved.length > 0) {
            for (const folder of activatedWkspcFoldersRemoved) {
                this.activatedWorkspaces.delete(folder);
            }
        }
        this.addRemoveDocOpenedHandlers();
    }

    protected hasMultipleWorkspaces(): boolean {
        return (getWorkspaceFolders()?.length || 0) > 1;
    }

    protected getWorkspaceKey(resource: Resource): string {
        const workspaceFolder = resource ? workspace.getWorkspaceFolder(resource) : undefined;
        return workspaceFolder
            ? path.normalize(
                  getOSType() === OSType.Windows
                      ? workspaceFolder.uri.fsPath.toUpperCase()
                      : workspaceFolder.uri.fsPath,
              )
            : '';
    }
}
