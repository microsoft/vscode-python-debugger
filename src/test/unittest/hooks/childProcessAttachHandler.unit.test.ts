// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import { anything, capture, instance, mock, verify, when } from 'ts-mockito';
import { ChildProcessAttachEventHandler } from '../../../extension/debugger/hooks/childProcessAttachHandler';
import { ChildProcessAttachService } from '../../../extension/debugger/hooks/childProcessAttachService';
import { DebuggerEvents } from '../../../extension/debugger/hooks/constants';
import { AttachRequestArguments } from '../../../extension/types';
import { DebuggerTypeName } from '../../../extension/constants';
import { debuggerTypeName } from '../../common';

suite('Debug - Child Process', () => {
    test('Do not attach if the event is undefined', async () => {
        const attachService = mock(ChildProcessAttachService);
        const handler = new ChildProcessAttachEventHandler(instance(attachService));
        await handler.handleCustomEvent(undefined as any);
        verify(attachService.attach(anything(), anything())).never();
    });
    test('Do not attach to child process if event is invalid', async () => {
        const attachService = mock(ChildProcessAttachService);
        const handler = new ChildProcessAttachEventHandler(instance(attachService));
        const body: any = {};
        const session: any = {};
        await handler.handleCustomEvent({ event: 'abc', body, session });
        verify(attachService.attach(body, session)).never();
    });
    test('Do not attach to child process if ptvsd_attach event is invalid', async () => {
        const attachService = mock(ChildProcessAttachService);
        const handler = new ChildProcessAttachEventHandler(instance(attachService));
        const body: any = {};
        const session: any = {};
        await handler.handleCustomEvent({ event: DebuggerEvents.PtvsdAttachToSubprocess, body, session });
        verify(attachService.attach(body, session)).never();
    });
    test('Do not attach to child process if debugpy_attach event is invalid', async () => {
        const attachService = mock(ChildProcessAttachService);
        const handler = new ChildProcessAttachEventHandler(instance(attachService));
        const body: any = {};
        const session: any = {};
        await handler.handleCustomEvent({ event: DebuggerEvents.DebugpyAttachToSubprocess, body, session });
        verify(attachService.attach(body, session)).never();
    });
    test('Exceptions are not bubbled up if exceptions are thrown', async () => {
        const attachService = mock(ChildProcessAttachService);
        const handler = new ChildProcessAttachEventHandler(instance(attachService));
        const body: AttachRequestArguments = {
            name: 'Attach',
            type: debuggerTypeName,
            request: 'attach',
            port: 1234,
            subProcessId: 2,
        };
        const session: any = { configuration: { type: DebuggerTypeName } };
        when(attachService.attach(body, session)).thenThrow(new Error('Kaboom'));
        await handler.handleCustomEvent({ event: DebuggerEvents.DebugpyAttachToSubprocess, body, session });
        verify(attachService.attach(body, anything())).once();
        const [, secondArg] = capture(attachService.attach).last();
        expect(secondArg).to.deep.equal(session);
    });
});
