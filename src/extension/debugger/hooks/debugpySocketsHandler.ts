// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { DebugSessionCustomEvent } from 'vscode';
import { swallowExceptions } from '../../common/utils/decorators';
import { DebuggerEvents } from './constants';
import { DebuggerTypeName } from '../../constants';
import { DebugPortAttributesProvider } from '../debugPort/portAttributesProvider';
import { IDebugSessionEventHandlers } from './types';

/**
 * This class is responsible for register ports using by debugpy in the portProvider.
 * @export
 * @class ChildProcessAttachEventHandler
 * @implements {IDebugSessionEventHandlers}
 */
@injectable()
export class DebugpySocketsHandler implements IDebugSessionEventHandlers {
    constructor(
        @inject(DebugPortAttributesProvider) private readonly debugPortAttributesProvider: DebugPortAttributesProvider,
    ) {}

    @swallowExceptions('Handle child process launch')
    public async handleCustomEvent(event: DebugSessionCustomEvent): Promise<void> {
        if (!event || event.session.configuration.type !== DebuggerTypeName) {
            return;
        }

        if (event.event === DebuggerEvents.DebugpySockets) {
            let portSocket = event.body.sockets.find((socket: { [x: string]: any }) => {
                return socket['internal'] === false;
            });
            if (portSocket !== undefined) {
                this.debugPortAttributesProvider.setPortAttribute(portSocket.port);
            }
        } else {
            return;
        }
    }
}
