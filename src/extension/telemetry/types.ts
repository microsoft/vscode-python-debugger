// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import type { IEventNamePropertyMapping } from './index';
import { EventName } from './constants';

export type DebuggerTelemetry = IEventNamePropertyMapping[EventName.DEBUGGER];

export type EditorLoadTelemetry = IEventNamePropertyMapping[EventName.EDITOR_LOAD];
