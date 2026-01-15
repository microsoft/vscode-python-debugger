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
import { EXTENSION_ROOT_DIR_FOR_TESTS } from '../../../../constants';
import { openReportIssue } from '../../../../../extension/common/application/commands/reportIssueCommand';
import { PythonEnvironment } from '../../../../../extension/envExtApi';

suite('Report Issue Command', () => {
    let executeCommandStub: sinon.SinonStub;
    let resolveEnvironmentStub: sinon.SinonStub;

    setup(async () => {
        executeCommandStub = sinon.stub(vscodeapi, 'executeCommand');
        resolveEnvironmentStub = sinon.stub(pythonApi, 'resolveEnvironment');
        // Ensure useEnvironmentsExtension is false for these tests
        (pythonApi as any).useEnvironmentsExtension = false;
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
        (pythonApi as any).useEnvironmentsExtension = undefined;
    });

    test('Test if issue body is filled correctly when including all the settings', async () => {
        await openReportIssue();

        const issueTemplatePath = path.join(
            EXTENSION_ROOT_DIR_FOR_TESTS,
            'src',
            'test',
            'resources',
            'issueTemplate.md',
        );
        const expectedIssueBody = fs.readFileSync(issueTemplatePath, 'utf8');

        const userDataTemplatePath = path.join(
            EXTENSION_ROOT_DIR_FOR_TESTS,
            'src',
            'test',
            'resources',
            'issueUserDataTemplate.md',
        );
        const expectedData = fs.readFileSync(userDataTemplatePath, 'utf8');

        executeCommandStub.withArgs('workbench.action.openIssueReporter', sinon.match.any).resolves();

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
