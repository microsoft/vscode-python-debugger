// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

suite('Debugging - launch.json schema', () => {
    const packageJsonPath = path.resolve(__dirname, '..', '..', '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const debuggerContribution = packageJson.contributes.debuggers.find((d: { type: string }) => d.type === 'debugpy');

    ['launch', 'attach'].forEach((request) => {
        suite(`${request} configuration`, () => {
            const properties = debuggerContribution.configurationAttributes[request].properties;

            ['steppingResumesAllThreads', 'stopAllThreadsOnSuspend'].forEach((option) => {
                test(`${option} is declared as a boolean that defaults to true`, () => {
                    expect(properties).to.have.property(option);
                    expect(properties[option].type).to.equal('boolean');
                    expect(properties[option].default).to.equal(true);
                    expect(properties[option].description).to.be.a('string').that.is.not.empty;
                });
            });
        });
    });
});
