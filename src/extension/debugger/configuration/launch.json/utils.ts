// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Resource } from '@vscode/python-extension';
import { WorkspaceConfiguration, workspace } from 'vscode';

export function getConfiguration(section: string, scope?: Resource): WorkspaceConfiguration {
    return workspace.getConfiguration(section, scope);
}
