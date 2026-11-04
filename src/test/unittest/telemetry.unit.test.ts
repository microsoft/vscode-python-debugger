// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TelemetryReporter } from '@vscode/extension-telemetry';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as constants from '../../extension/common/constants';
import { clearTelemetryReporter, sendTelemetryEvent } from '../../extension/telemetry';
import { EventName } from '../../extension/telemetry/constants';
import * as reporterFactory from '../../extension/telemetry/reporter';

suite('Telemetry reporter lifetime', () => {
    let reporter: sinon.SinonStubbedInstance<TelemetryReporter>;
    let factory: sinon.SinonStub;

    setup(async () => {
        await clearTelemetryReporter();
        sinon.stub(constants, 'isTestExecution').returns(false);
        reporter = sinon.createStubInstance(TelemetryReporter);
        reporter.dispose.resolves();
        factory = sinon.stub(reporterFactory, 'getTelemetryReporter').returns(reporter);
    });

    teardown(async () => {
        await clearTelemetryReporter();
        sinon.restore();
    });

    test('Usage and error events reuse the same reporter', () => {
        sendTelemetryEvent(EventName.DEBUG_SUCCESS_ACTIVATION);
        sendTelemetryEvent(EventName.DEBUG_SESSION_ERROR, undefined, undefined, new Error('debug failure'));

        expect(factory.firstCall.args[0]).to.equal(undefined);
        expect(factory.secondCall.args[0]).to.equal(reporter);
        sinon.assert.calledOnce(reporter.sendTelemetryEvent);
        sinon.assert.calledOnce(reporter.sendTelemetryErrorEvent);
        sinon.assert.notCalled(reporter.dispose);
    });

    test('Clearing disposes the reporter once and resets the next session', async () => {
        sendTelemetryEvent(EventName.DEBUG_SUCCESS_ACTIVATION);
        await clearTelemetryReporter();
        await clearTelemetryReporter();
        sinon.assert.calledOnce(reporter.dispose);

        const nextReporter = sinon.createStubInstance(TelemetryReporter);
        nextReporter.dispose.resolves();
        factory.returns(nextReporter);
        sendTelemetryEvent(EventName.DEBUG_SUCCESS_ACTIVATION);

        expect(factory.secondCall.args[0]).to.equal(undefined);
        sinon.assert.calledOnce(nextReporter.sendTelemetryEvent);
        await clearTelemetryReporter();
        sinon.assert.calledOnce(nextReporter.dispose);
        sinon.assert.calledOnce(reporter.dispose);
    });
});
