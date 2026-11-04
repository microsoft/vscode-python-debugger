// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as telemetry from '@vscode/extension-telemetry';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as constants from '../../extension/common/constants';
import { createDeferred } from '../../extension/common/utils/async';
import { sendTelemetryEvent } from '../../extension/telemetry';
import { EventName } from '../../extension/telemetry/constants';
import { clearTelemetryReporter, getTelemetryReporter } from '../../extension/telemetry/reporter';

const TelemetryReporter = telemetry.TelemetryReporter;

suite('Telemetry reporter lifetime', () => {
    let reporter: sinon.SinonStubbedInstance<telemetry.TelemetryReporter>;
    let constructor: sinon.SinonStub;

    setup(async () => {
        await clearTelemetryReporter();
        sinon.stub(constants, 'isTestExecution').returns(false);
        reporter = sinon.createStubInstance(TelemetryReporter);
        reporter.dispose.resolves();
        constructor = sinon.stub(telemetry, 'TelemetryReporter').returns(reporter);
    });

    teardown(async () => {
        await clearTelemetryReporter();
        sinon.restore();
    });

    test('Usage and error events reuse the same reporter', () => {
        sendTelemetryEvent(EventName.DEBUG_SUCCESS_ACTIVATION);
        sendTelemetryEvent(EventName.DEBUG_SESSION_ERROR, undefined, undefined, new Error('debug failure'));

        expect(getTelemetryReporter()).to.equal(reporter);
        expect(getTelemetryReporter()).to.equal(reporter);
        sinon.assert.calledOnce(constructor);
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
        constructor.returns(nextReporter);
        sendTelemetryEvent(EventName.DEBUG_SUCCESS_ACTIVATION);

        expect(getTelemetryReporter()).to.equal(nextReporter);
        sinon.assert.calledTwice(constructor);
        sinon.assert.calledOnce(nextReporter.sendTelemetryEvent);
        await clearTelemetryReporter();
        sinon.assert.calledOnce(nextReporter.dispose);
        sinon.assert.calledOnce(reporter.dispose);
    });

    test('Clearing an unused reporter does not create it', async () => {
        await clearTelemetryReporter();

        sinon.assert.notCalled(constructor);
        sinon.assert.notCalled(reporter.dispose);
    });

    test('Clearing resets the cache before asynchronous disposal completes', async () => {
        const disposal = createDeferred();
        reporter.dispose.returns(disposal.promise);
        expect(getTelemetryReporter()).to.equal(reporter);

        let completed = false;
        const clearing = clearTelemetryReporter().then(() => {
            completed = true;
        });
        try {
            await Promise.resolve();
            expect(completed).to.equal(false);
            sinon.assert.calledOnce(reporter.dispose);

            const nextReporter = sinon.createStubInstance(TelemetryReporter);
            nextReporter.dispose.resolves();
            constructor.returns(nextReporter);

            expect(getTelemetryReporter()).to.equal(nextReporter);
            sinon.assert.calledTwice(constructor);
            sinon.assert.notCalled(nextReporter.dispose);
        } finally {
            disposal.resolve();
            await clearing;
        }
        expect(completed).to.equal(true);
    });
});
