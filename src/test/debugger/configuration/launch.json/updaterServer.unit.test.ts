// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as sinon from 'sinon';
import { instance, mock } from 'ts-mockito';
import { PythonDebugConfigurationService } from '../../../../extension/debugger/configuration/debugConfigurationService';
import { LaunchJsonUpdaterService } from '../../../../extension/debugger/configuration/launch.json/updaterService';
import { LaunchJsonUpdaterServiceHelper } from '../../../../extension/debugger/configuration/launch.json/updaterServiceHelper';
import { IDebugConfigurationService } from '../../../../extension/debugger/types';
import * as vscodeapi from '../../../../extension/common/vscodeapi';

suite('Debugging - launch.json Updater Service', () => {
    let helper: LaunchJsonUpdaterServiceHelper;
    let debugConfigService: IDebugConfigurationService;
    let registerCommandStub: sinon.SinonStub;
    setup(() => {
        debugConfigService = mock(PythonDebugConfigurationService);
        helper = new LaunchJsonUpdaterServiceHelper(instance(debugConfigService));
        registerCommandStub = sinon.stub(vscodeapi, 'registerCommand');
    });
    test('Activation will register the required commands', async () => {
        const service = new LaunchJsonUpdaterService([], instance(debugConfigService));
        await service.activate();
        sinon.assert.calledOnceWithExactly(
            registerCommandStub,
            'python.SelectAndInsertDebugConfiguration',
            helper.selectAndInsertDebugConfig,
            helper,
        );
    });
});
