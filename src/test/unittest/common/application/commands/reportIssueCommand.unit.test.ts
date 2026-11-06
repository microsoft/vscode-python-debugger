/* eslint-disable global-require */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as sinon from 'sinon';
import * as fs from 'fs-extra';
import * as path from 'path';
import { expect } from 'chai';
import * as Telemetry from '../../../../../extension/telemetry/index';
import { EventName } from '../../../../../extension/telemetry/constants';
import * as vscodeapi from '../../../../../extension/common/vscodeapi';
import * as pythonApi from '../../../../../extension/common/python';
import { EXTENSION_ROOT_DIR_FOR_TESTS, TEST_TIMEOUT } from '../../../../constants';
import { EXTENSION_ROOT_DIR } from '../../../../../extension/common/constants';
import { openReportIssue } from '../../../../../extension/common/application/commands/reportIssueCommand';
import { PythonEnvironment } from '../../../../../extension/envExtApi';

suite('Report Issue Command', () => {
    let executeCommandStub: sinon.SinonStub;
    let resolveEnvironmentStub: sinon.SinonStub;
    const templatePath = path.join(EXTENSION_ROOT_DIR, 'resources', 'report_issue_template.md');
    const userTemplatePath = path.join(EXTENSION_ROOT_DIR, 'resources', 'report_issue_user_data_template.md');
    let template: string;
    let userTemplate: string;
    let expectedIssueBody: string;
    let expectedData: string;

    suiteSetup(async function () {
        this.timeout(TEST_TIMEOUT);
        [template, userTemplate, expectedIssueBody, expectedData] = await Promise.all([
            fs.readFile(templatePath, 'utf8'),
            fs.readFile(userTemplatePath, 'utf8'),
            fs.readFile(
                path.join(EXTENSION_ROOT_DIR_FOR_TESTS, 'src', 'test', 'resources', 'issueTemplate.md'),
                'utf8',
            ),
            fs.readFile(
                path.join(EXTENSION_ROOT_DIR_FOR_TESTS, 'src', 'test', 'resources', 'issueUserDataTemplate.md'),
                'utf8',
            ),
        ]);
    });

    setup(() => {
        const readFileStub = sinon.stub(fs, 'readFile').rejects(new Error('Unexpected template file read'));
        readFileStub.withArgs(templatePath, 'utf8').resolves(template);
        readFileStub.withArgs(userTemplatePath, 'utf8').resolves(userTemplate);
        executeCommandStub = sinon.stub(vscodeapi, 'executeCommand');
        sinon
            .stub(pythonApi, 'getActiveEnvironmentPath')
            .resolves({ id: '/path/to/interpreter', path: '/path/to/interpreter' });
        resolveEnvironmentStub = sinon.stub(pythonApi, 'resolveEnvironment');
        const interpreter = {
            envId: {
                id: '/path/to/interpreter',
                managerId: 'Venv',
            },
            version: '3.9.0',
        } as unknown as PythonEnvironment;
        resolveEnvironmentStub.resolves(interpreter);
    });

    teardown(() => {
        sinon.restore();
    });

    test('Test if issue body is filled correctly when including all the settings', async () => {
        executeCommandStub.withArgs('workbench.action.openIssueReporter', sinon.match.any).resolves();
        await openReportIssue();
        sinon.assert.calledOnceWithExactly(resolveEnvironmentStub, '/path/to/interpreter');

        sinon.assert.calledOnceWithExactly(executeCommandStub, 'workbench.action.openIssueReporter', sinon.match.any);

        const { issueBody, data } = executeCommandStub.getCall(0).args[1];
        expect(issueBody).to.be.equal(expectedIssueBody);
        expect(data).to.be.equal(expectedData);
    });

    test('Should send telemetry event when run Report Issue Command', async () => {
        const sendTelemetryStub = sinon.stub(Telemetry, 'sendTelemetryEvent');
        await openReportIssue();

        sinon.assert.calledWith(sendTelemetryStub, EventName.USE_REPORT_ISSUE_COMMAND);
        sinon.restore();
    });
});
