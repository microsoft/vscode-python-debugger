// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as assert from 'assert';
import { test } from 'mocha';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { IExtensionSingleActivationService } from '../../../extension/activation/types';
import { DebugService } from '../../../extension/common/application/debugService';
import { IDebugService } from '../../../extension/common/application/types';
import { IDisposableRegistry } from '../../../extension/common/types';
import { DebugAdapterActivator } from '../../../extension/debugger/adapter/activator';
import { DebugAdapterDescriptorFactory } from '../../../extension/debugger/adapter/factory';
import { DebugSessionLoggingFactory } from '../../../extension/debugger/adapter/logging';
import { OutdatedDebuggerPromptFactory } from '../../../extension/debugger/adapter/outdatedDebuggerPrompt';
import { AttachProcessProviderFactory } from '../../../extension/debugger/attachQuickPick/factory';
import { IAttachProcessProviderFactory } from '../../../extension/debugger/attachQuickPick/types';
import { IDebugAdapterDescriptorFactory, IOutdatedDebuggerPromptFactory } from '../../../extension/debugger/types';
import { IDebugSessionLoggingFactory } from '../../../extension/debugger/types';
import { clearTelemetryReporter } from '../../../extension/telemetry';
import { noop } from '../../core';

suite('Debugging - Adapter Factory and logger Registration', () => {
    let activator: IExtensionSingleActivationService;
    let debugService: IDebugService;
    let descriptorFactory: IDebugAdapterDescriptorFactory;
    let loggingFactory: IDebugSessionLoggingFactory;
    let debuggerPromptFactory: IOutdatedDebuggerPromptFactory;
    let disposableRegistry: IDisposableRegistry;
    let attachFactory: IAttachProcessProviderFactory;

    setup(() => {
        attachFactory = mock(AttachProcessProviderFactory);

        debugService = mock(DebugService);
        when(debugService.onDidStartDebugSession).thenReturn(() => noop as any);

        // when(configService.getSettings(undefined)).thenReturn(({
        //     experiments: { enabled: true },
        // } as any) as IPythonSettings);

        descriptorFactory = mock(DebugAdapterDescriptorFactory);
        loggingFactory = mock(DebugSessionLoggingFactory);
        debuggerPromptFactory = mock(OutdatedDebuggerPromptFactory);
        disposableRegistry = [];

        activator = new DebugAdapterActivator(
            instance(debugService),
            instance(descriptorFactory),
            instance(loggingFactory),
            instance(debuggerPromptFactory),
            disposableRegistry,
            instance(attachFactory),
        );
    });

    teardown(() => {
        clearTelemetryReporter();
    });

    test('Register Debug adapter factory', async () => {
        await activator.activate();

        verify(debugService.registerDebugAdapterTrackerFactory('python-debugger', instance(loggingFactory))).once();
        verify(
            debugService.registerDebugAdapterTrackerFactory('python-debugger', instance(debuggerPromptFactory)),
        ).once();
        verify(
            debugService.registerDebugAdapterDescriptorFactory('python-debugger', instance(descriptorFactory)),
        ).once();
    });

    test('Register a disposable item', async () => {
        const disposable = { dispose: noop };
        when(debugService.registerDebugAdapterTrackerFactory(anything(), anything())).thenReturn(disposable);
        when(debugService.registerDebugAdapterDescriptorFactory(anything(), anything())).thenReturn(disposable);

        await activator.activate();

        assert.deepEqual(disposableRegistry, [disposable, disposable, disposable]);
    });
});
