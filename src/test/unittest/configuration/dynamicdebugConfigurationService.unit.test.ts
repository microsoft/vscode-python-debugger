// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import { Uri, WorkspaceFolder } from 'vscode';
import { DynamicPythonDebugConfigurationService } from '../../../extension/debugger/configuration/dynamicdebugConfigurationService';
import * as configurationUtils from '../../../extension/debugger/configuration/utils/configuration';

suite('Debugging - Dynamic Debug Configuration Service', () => {
    const folder: WorkspaceFolder = { uri: Uri.file('/work'), name: 'ws', index: 0 };
    let service: DynamicPythonDebugConfigurationService;
    let getFastApiPathsStub: sinon.SinonStub;

    setup(() => {
        service = new DynamicPythonDebugConfigurationService();
        sinon.stub(configurationUtils, 'getDjangoPaths').resolves([]);
        sinon.stub(configurationUtils, 'getFlaskPaths').resolves([]);
        getFastApiPathsStub = sinon.stub(configurationUtils, 'getFastApiPaths');
    });

    teardown(() => {
        sinon.restore();
    });

    const fastApiProviders = async () => {
        const result = await service.provideDebugConfigurations(folder);
        return (result ?? []).filter((c) => c.name?.includes('FastAPI'));
    };

    test('No FastAPI detected → no FastAPI configs offered', async () => {
        getFastApiPathsStub.resolves([]);

        const fastApi = await fastApiProviders();
        expect(fastApi).to.have.length(0);
    });

    test('Single match at workspace root → project config uses resolved path, file variant uses ${file}', async () => {
        getFastApiPathsStub.resolves([Uri.file('/work/main.py')]);

        const fastApi = await fastApiProviders();
        expect(fastApi).to.have.length(2);
        expect(fastApi[0]).to.include({ name: 'Python Debugger: FastAPI', module: 'fastapi' });
        expect(fastApi[0].args).to.deep.equal(['run', 'main.py']);
        expect(fastApi[1]).to.include({ name: 'Python Debugger: FastAPI File', module: 'fastapi' });
        expect(fastApi[1].args).to.deep.equal(['run', '${file}']);
    });

    test('Single match in subdirectory → project config passes path explicitly', async () => {
        getFastApiPathsStub.resolves([Uri.file('/work/backend/app/main.py')]);

        const fastApi = await fastApiProviders();
        expect(fastApi[0].args).to.deep.equal(['run', path.join('backend', 'app', 'main.py')]);
    });

    test('Multiple matches → project config falls back to plain `fastapi run`', async () => {
        getFastApiPathsStub.resolves([Uri.file('/work/svc-a/main.py'), Uri.file('/work/svc-b/main.py')]);

        const fastApi = await fastApiProviders();
        expect(fastApi[0].args).to.deep.equal(['run']);
    });
});
