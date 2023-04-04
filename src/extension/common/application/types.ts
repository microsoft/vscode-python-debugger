/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import {
    Breakpoint,
    BreakpointsChangeEvent,
    DebugAdapterDescriptorFactory,
    DebugAdapterTrackerFactory,
    DebugConfiguration,
    DebugConfigurationProvider,
    DebugConsole,
    DebugSession,
    DebugSessionCustomEvent,
    Disposable,
    Event,
    WorkspaceFolder,

} from 'vscode';
import { Resource } from '../types';


export const IDebugService = Symbol('IDebugManager');

export interface IDebugService {
    /**
     * The currently active [debug session](#DebugSession) or `undefined`. The active debug session is the one
     * represented by the debug action floating window or the one currently shown in the drop down menu of the debug action floating window.
     * If no debug session is active, the value is `undefined`.
     */
    readonly activeDebugSession: DebugSession | undefined;

    /**
     * The currently active [debug console](#DebugConsole).
     */
    readonly activeDebugConsole: DebugConsole;

    /**
     * List of breakpoints.
     */
    readonly breakpoints: readonly Breakpoint[];

    /**
     * An [event](#Event) which fires when the [active debug session](#debug.activeDebugSession)
     * has changed. *Note* that the event also fires when the active debug session changes
     * to `undefined`.
     */
    readonly onDidChangeActiveDebugSession: Event<DebugSession | undefined>;

    /**
     * An [event](#Event) which fires when a new [debug session](#DebugSession) has been started.
     */
    readonly onDidStartDebugSession: Event<DebugSession>;

    /**
     * An [event](#Event) which fires when a custom DAP event is received from the [debug session](#DebugSession).
     */
    readonly onDidReceiveDebugSessionCustomEvent: Event<DebugSessionCustomEvent>;

    /**
     * An [event](#Event) which fires when a [debug session](#DebugSession) has terminated.
     */
    readonly onDidTerminateDebugSession: Event<DebugSession>;

    /**
     * An [event](#Event) that is emitted when the set of breakpoints is added, removed, or changed.
     */
    readonly onDidChangeBreakpoints: Event<BreakpointsChangeEvent>;

    /**
     * Register a [debug configuration provider](#DebugConfigurationProvider) for a specific debug type.
     * More than one provider can be registered for the same type.
     *
     * @param type The debug type for which the provider is registered.
     * @param provider The [debug configuration provider](#DebugConfigurationProvider) to register.
     * @return A [disposable](#Disposable) that unregisters this provider when being disposed.
     */
    registerDebugConfigurationProvider(debugType: string, provider: DebugConfigurationProvider): Disposable;

    /**
     * Register a [debug adapter descriptor factory](#DebugAdapterDescriptorFactory) for a specific debug type.
     * An extension is only allowed to register a DebugAdapterDescriptorFactory for the debug type(s) defined by the extension. Otherwise an error is thrown.
     * Registering more than one DebugAdapterDescriptorFactory for a debug type results in an error.
     *
     * @param debugType The debug type for which the factory is registered.
     * @param factory The [debug adapter descriptor factory](#DebugAdapterDescriptorFactory) to register.
     * @return A [disposable](#Disposable) that unregisters this factory when being disposed.
     */
    registerDebugAdapterDescriptorFactory(debugType: string, factory: DebugAdapterDescriptorFactory): Disposable;

    /**
     * Register a debug adapter tracker factory for the given debug type.
     *
     * @param debugType The debug type for which the factory is registered or '*' for matching all debug types.
     * @param factory The [debug adapter tracker factory](#DebugAdapterTrackerFactory) to register.
     * @return A [disposable](#Disposable) that unregisters this factory when being disposed.
     */
    registerDebugAdapterTrackerFactory(debugType: string, factory: DebugAdapterTrackerFactory): Disposable;

    /**
     * Start debugging by using either a named launch or named compound configuration,
     * or by directly passing a [DebugConfiguration](#DebugConfiguration).
     * The named configurations are looked up in '.vscode/launch.json' found in the given folder.
     * Before debugging starts, all unsaved files are saved and the launch configurations are brought up-to-date.
     * Folder specific variables used in the configuration (e.g. '${workspaceFolder}') are resolved against the given folder.
     * @param folder The [workspace folder](#WorkspaceFolder) for looking up named configurations and resolving variables or `undefined` for a non-folder setup.
     * @param nameOrConfiguration Either the name of a debug or compound configuration or a [DebugConfiguration](#DebugConfiguration) object.
     * @return A thenable that resolves when debugging could be successfully started.
     */
    startDebugging(
        folder: WorkspaceFolder | undefined,
        nameOrConfiguration: string | DebugConfiguration,
        parentSession?: DebugSession,
    ): Thenable<boolean>;

    /**
     * Add breakpoints.
     * @param breakpoints The breakpoints to add.
     */
    addBreakpoints(breakpoints: Breakpoint[]): void;

    /**
     * Remove breakpoints.
     * @param breakpoints The breakpoints to remove.
     */
    removeBreakpoints(breakpoints: Breakpoint[]): void;
}

/**
* Wraps the `ActiveResourceService` API class. Created for injecting and mocking class methods in testing
*/
export const IActiveResourceService = Symbol('IActiveResourceService');
export interface IActiveResourceService {
   getActiveResource(): Resource;
}
