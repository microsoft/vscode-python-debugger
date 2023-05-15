// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { IEventNamePropertyMapping } from '.';
import { EventName } from './constants';

export type DebuggerTelemetry = IEventNamePropertyMapping[EventName.DEBUGGER];
