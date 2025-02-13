'use strict';

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as typemoq from 'typemoq';
import * as fs from 'fs-extra';
import { WorkspaceFolder, Uri, WorkspaceConfiguration } from 'vscode';
import {
    getConfigurationsForWorkspace,
    getConfigurationsFromSettings,
} from '../../../../extension/debugger/configuration/launch.json/launchJsonReader';
import * as vscodeapi from '../../../../extension/common/vscodeapi';

suite('Debugging - launchJsonReader', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('getConfigurationsForWorkspace', () => {
        test('Should return configurations from launch.json if it exists', async () => {
            const workspace = typemoq.Mock.ofType<WorkspaceFolder>();
            workspace.setup((w) => w.uri).returns(() => Uri.file('/path/to/workspace'));

            const launchJsonContent = `{
                "version": "0.2.0",
                "configurations": [
                    {
                        "name": "Launch Program",
                        "type": "python",
                        "request": "launch",
                        "program": "${workspace.object.uri}/app.py"
                    }
                ]
            }`;

            sandbox.stub(fs, 'pathExists').resolves(true);
            sandbox.stub(fs, 'readFile').resolves(launchJsonContent);

            const configurations = await getConfigurationsForWorkspace(workspace.object);
            assert.strictEqual(configurations.length, 1);
            assert.strictEqual(configurations[0].name, 'Launch Program');
        });

        test('Should return configurations from settings.json if launch.json does not exist', async () => {
            const workspace = typemoq.Mock.ofType<WorkspaceFolder>();
            workspace.setup((w) => w.uri).returns(() => Uri.file('/path/to/workspace'));

            const mockConfig = typemoq.Mock.ofType<WorkspaceConfiguration>();
            mockConfig
                .setup((c) => c.configurations)
                .returns(() => [
                    {
                        name: 'Launch Program 2',
                        type: 'python',
                        request: 'launch',
                        program: '${workspaceFolder}/app.py',
                    },
                ]);

            sandbox.stub(fs, 'pathExists').resolves(false);
            sandbox.stub(vscodeapi, 'getConfiguration').returns(mockConfig.object);

            const configurations = await getConfigurationsForWorkspace(workspace.object);
            assert.strictEqual(configurations.length, 1);
            assert.strictEqual(configurations[0].name, 'Launch Program 2');
        });
    });

    suite('getConfigurationsFromSettings', () => {
        test('Should return configurations from settings.json', () => {
            const workspace = typemoq.Mock.ofType<WorkspaceFolder>();
            workspace.setup((w) => w.uri).returns(() => Uri.file('/path/to/workspace'));

            const mockConfig = typemoq.Mock.ofType<WorkspaceConfiguration>();
            mockConfig
                .setup((c) => c.configurations)
                .returns(() => [
                    {
                        name: 'Launch Program 3',
                        type: 'python',
                        request: 'launch',
                        program: '${workspaceFolder}/app.py',
                    },
                ]);

            sandbox.stub(vscodeapi, 'getConfiguration').returns(mockConfig.object);

            const configurations = getConfigurationsFromSettings(workspace.object);
            assert.strictEqual(configurations.length, 1);
            assert.strictEqual(configurations[0].name, 'Launch Program 3');
        });

        test('Should error if no configurations in settings.json', () => {
            const workspace = typemoq.Mock.ofType<WorkspaceFolder>();
            workspace.setup((w) => w.uri).returns(() => Uri.file('/path/to/workspace'));

            const mockConfig = typemoq.Mock.ofType<WorkspaceConfiguration>();
            mockConfig.setup((c) => c.get('configurations')).returns(() => []);
            mockConfig.setup((c) => c.configurations).returns(() => []);

            sandbox.stub(vscodeapi, 'getConfiguration').returns(mockConfig.object);

            assert.throws(
                () => getConfigurationsFromSettings(workspace.object),
                Error,
                'No configurations found in launch.json or settings.json',
            );
        });
    });
});
