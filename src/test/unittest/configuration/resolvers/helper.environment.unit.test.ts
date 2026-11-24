// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as sinon from 'sinon';
import * as envParser from '../../../../extension/common/variables/environment';
import { getDebugEnvironmentVariables } from '../../../../extension/debugger/configuration/resolvers/helper';
import { LaunchRequestArguments } from '../../../../extension/types';

suite('Debugging - Environment Variable Substitution', () => {
    let parseFileStub: sinon.SinonStub;

    setup(() => {
        parseFileStub = sinon.stub(envParser, 'parseFile');
        sinon.stub(envParser, 'mergeVariables');
        sinon.stub(envParser, 'appendPath');
        sinon.stub(envParser, 'appendPythonPath');
    });

    teardown(() => {
        sinon.restore();
    });

    test('Environment variables from process.env should be available for substitution in .env file', async () => {
        // Arrange
        const args: LaunchRequestArguments = {
            name: 'Test',
            type: 'debugpy',
            request: 'launch',
            envFile: '/path/to/.env',
            env: {
                CUSTOM_VAR: 'custom_value',
            },
        };

        // Set up process.env
        const originalPath = process.env.PATH;
        process.env.PATH = '/usr/bin:/usr/local/bin';

        parseFileStub.resolves({
            EXPANDED_PATH: '${PATH}:/my/custom/path',
        });

        // Act
        await getDebugEnvironmentVariables(args);

        // Assert
        // Verify that parseFile was called with merged environment variables
        expect(parseFileStub.calledOnce).to.be.true;
        const [envFilePath, baseVars] = parseFileStub.firstCall.args;
        expect(envFilePath).to.equal('/path/to/.env');
        expect(baseVars).to.have.property('PATH', '/usr/bin:/usr/local/bin');
        expect(baseVars).to.have.property('CUSTOM_VAR', 'custom_value');

        // Restore process.env
        if (originalPath !== undefined) {
            process.env.PATH = originalPath;
        }
    });

    test('Debug launch env vars should override process.env during substitution', async () => {
        // Arrange
        const args: LaunchRequestArguments = {
            name: 'Test',
            type: 'debugpy',
            request: 'launch',
            envFile: '/path/to/.env',
            env: {
                PATH: '/custom/path',
                MY_VAR: 'my_value',
            },
        };

        // Set up process.env
        const originalPath = process.env.PATH;
        process.env.PATH = '/usr/bin:/usr/local/bin';
        process.env.MY_VAR = 'system_value';

        parseFileStub.resolves({});

        // Act
        await getDebugEnvironmentVariables(args);

        // Assert
        expect(parseFileStub.calledOnce).to.be.true;
        const [, baseVars] = parseFileStub.firstCall.args;
        // Debug launch vars should override process.env
        expect(baseVars).to.have.property('PATH', '/custom/path');
        expect(baseVars).to.have.property('MY_VAR', 'my_value');

        // Restore process.env
        if (originalPath !== undefined) {
            process.env.PATH = originalPath;
        }
        delete process.env.MY_VAR;
    });

    test('All process.env variables should be available for substitution', async () => {
        // Arrange
        const args: LaunchRequestArguments = {
            name: 'Test',
            type: 'debugpy',
            request: 'launch',
            envFile: '/path/to/.env',
            env: {},
        };

        // Set up process.env
        const originalEnv = { ...process.env };
        process.env.TEST_VAR_1 = 'value1';
        process.env.TEST_VAR_2 = 'value2';
        process.env.PATH = '/test/path';

        parseFileStub.resolves({});

        // Act
        await getDebugEnvironmentVariables(args);

        // Assert
        expect(parseFileStub.calledOnce).to.be.true;
        const [, baseVars] = parseFileStub.firstCall.args;
        expect(baseVars).to.have.property('TEST_VAR_1', 'value1');
        expect(baseVars).to.have.property('TEST_VAR_2', 'value2');
        expect(baseVars).to.have.property('PATH', '/test/path');

        // Restore process.env
        Object.keys(process.env).forEach((key) => {
            if (!(key in originalEnv)) {
                delete process.env[key];
            }
        });
        Object.assign(process.env, originalEnv);
    });

    test('Empty env in launch config should still provide process.env for substitution', async () => {
        // Arrange
        const args: LaunchRequestArguments = {
            name: 'Test',
            type: 'debugpy',
            request: 'launch',
            envFile: '/path/to/.env',
            // No env property
        };

        const originalPath = process.env.PATH;
        process.env.PATH = '/usr/bin';

        parseFileStub.resolves({});

        // Act
        await getDebugEnvironmentVariables(args);

        // Assert
        expect(parseFileStub.calledOnce).to.be.true;
        const [, baseVars] = parseFileStub.firstCall.args;
        expect(baseVars).to.have.property('PATH', '/usr/bin');

        // Restore
        if (originalPath !== undefined) {
            process.env.PATH = originalPath;
        }
    });
});
