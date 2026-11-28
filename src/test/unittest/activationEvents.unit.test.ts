// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as path from 'path';
import * as fs from 'fs-extra';
import { expect } from 'chai';
import { EXTENSION_ROOT_DIR_FOR_TESTS } from '../constants';

suite('Extension activation events', () => {
    // The launch.json completion items are only registered after activation, so the
    // extension has to activate in Python workspaces even if no Python file is open.
    const pythonWorkspaceMarkers = [
        'workspaceContains:mspythonconfig.json',
        'workspaceContains:pyproject.toml',
        'workspaceContains:Pipfile',
        'workspaceContains:setup.py',
        'workspaceContains:requirements.txt',
        'workspaceContains:pylock.toml',
        'workspaceContains:manage.py',
        'workspaceContains:app.py',
        'workspaceContains:.venv',
        'workspaceContains:.conda',
    ];

    test('Declares workspaceContains activation events for Python projects', async () => {
        const packageJson = await fs.readJSON(path.join(EXTENSION_ROOT_DIR_FOR_TESTS, 'package.json'));

        expect(packageJson.activationEvents).to.include.members(pythonWorkspaceMarkers);
    });
});
