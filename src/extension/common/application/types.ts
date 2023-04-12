/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { Resource } from '../types';

/**
 * Wraps the `ActiveResourceService` API class. Created for injecting and mocking class methods in testing
 */
export const IActiveResourceService = Symbol('IActiveResourceService');
export interface IActiveResourceService {
    getActiveResource(): Resource;
}
