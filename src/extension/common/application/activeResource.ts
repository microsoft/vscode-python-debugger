// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { injectable } from 'inversify';
import { Resource } from '../types';
import { getActiveTextEditor, getWorkspaceFolders } from '../vscodeapi';
import { IActiveResourceService } from './types';

@injectable()
export class ActiveResourceService implements IActiveResourceService {
    constructor() {}

    public getActiveResource(): Resource {
        const editor = getActiveTextEditor();
        if (editor && !editor.document.isUntitled) {
            return editor.document.uri;
        }
        const workspaceFolders = getWorkspaceFolders();
        return Array.isArray(workspaceFolders) &&
            workspaceFolders.length > 0
            ? workspaceFolders[0].uri
            : undefined;
    }
}
