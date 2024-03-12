// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as fs from 'fs-extra';
import * as path from 'path';
import { executeCommand } from '../../vscodeapi';
import { getActiveEnvironmentPath, resolveEnvironment } from '../../python';
import { EXTENSION_ROOT_DIR } from '../../constants';
import { getRawVersion } from '../../settings';
import { sendTelemetryEvent } from '../../../telemetry';
import { EventName } from '../../../telemetry/constants';

/**
 * Allows the user to report an issue related to the Python Debugger extension using our template.
 */
export async function openReportIssue(): Promise<void> {
    const templatePath = path.join(EXTENSION_ROOT_DIR, 'resources', 'report_issue_template.md');
    const userDataTemplatePath = path.join(EXTENSION_ROOT_DIR, 'resources', 'report_issue_user_data_template.md');
    const template = await fs.readFile(templatePath, 'utf8');
    const userTemplate = await fs.readFile(userDataTemplatePath, 'utf8');
    const interpreterPath = await getActiveEnvironmentPath();
    const interpreter = await resolveEnvironment(interpreterPath);
    const virtualEnvKind = interpreter?.environment?.type || 'Unknown';

    const pythonVersion = getRawVersion(interpreter?.version);
    await executeCommand('workbench.action.openIssueReporter', {
        extensionId: 'ms-python.debugpy',
        issueBody: template,
        data: userTemplate.replace('{0}', pythonVersion).replace('{1}', virtualEnvKind),
    });
    sendTelemetryEvent(EventName.USE_REPORT_ISSUE_COMMAND, undefined, {});
}
