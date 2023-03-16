// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { CommandsWithoutArgs } from '../../../common/application/commands';
import { DiagnosticScope } from '../types';

export type CommandOption<Type, Option> = { type: Type; options: Option };
type LaunchBrowserOption = CommandOption<'launch', string>;
type IgnoreDiagnosticOption = CommandOption<'ignore', DiagnosticScope>;
type ExecuteVSCCommandOption = CommandOption<'executeVSCCommand', CommandsWithoutArgs>;
export type CommandOptions = LaunchBrowserOption | IgnoreDiagnosticOption | ExecuteVSCCommandOption;
