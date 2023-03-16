// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { DiagnosticSeverity, workspace } from 'vscode';
import { isTestExecution } from '../../common/constants';
import { traceInfo, traceLog } from '../../common/log/logging';
import { Resource } from '../../common/types';
import { IServiceContainer } from '../../debugger/ioc/types';
import { IDiagnostic, IDiagnosticsService, ISourceMapSupportService } from './types';
import { IApplicationDiagnostics } from '../types';


function log(diagnostics: IDiagnostic[]): void {
    diagnostics.forEach((item) => {
        const message = `Diagnostic Code: ${item.code}, Message: ${item.message}`;
        switch (item.severity) {
            case DiagnosticSeverity.Error:
            case DiagnosticSeverity.Warning: {
                traceLog(message);
                break;
            }
            default: {
                traceInfo(message);
            }
        }
    });
}

async function runDiagnostics(diagnosticServices: IDiagnosticsService[], resource: Resource): Promise<void> {
    await Promise.all(
        diagnosticServices.map(async (diagnosticService) => {
            const diagnostics = await diagnosticService.diagnose(resource);
            if (diagnostics.length > 0) {
                log(diagnostics);
                await diagnosticService.handle(diagnostics);
            }
        }),
    );
}

@injectable()
export class ApplicationDiagnostics implements IApplicationDiagnostics {
    constructor(@inject(IServiceContainer) private readonly serviceContainer: IServiceContainer) {}

    public register() {
        this.serviceContainer.get<ISourceMapSupportService>(ISourceMapSupportService).register();
    }

    public async performPreStartupHealthCheck(resource: Resource): Promise<void> {
        // When testing, do not perform health checks, as modal dialogs can be displayed.
        if (isTestExecution()) {
            return;
        }
        let services = this.serviceContainer.getAll<IDiagnosticsService>(IDiagnosticsService);
        if (workspace.isTrusted) {
            services = services.filter((item) => item.runInUntrustedWorkspace);
        }
        // Perform these validation checks in the foreground.
        await runDiagnostics(
            services.filter((item) => !item.runInBackground),
            resource,
        );

        // Perform these validation checks in the background.
        runDiagnostics(
            services.filter((item) => item.runInBackground),
            resource,
        ).ignoreErrors();
    }
}
