'use strict';

// This line should always be right on top.

if ((Reflect as any).metadata === undefined) {
    require('reflect-metadata');
}

// // Initialize source maps (this must never be moved up nor further down).
import { initialize } from './debugger/sourceMapSupport';
initialize(require('vscode'));

//===============================================
// We start tracking the extension's startup time at this point.  The
// locations at which we record various Intervals are marked below in
// the same way as this.

const durations = {} as IStartupDurations;
import { StopWatch } from './common/utils/stopWatch';

// Initialize file logging here. This should not depend on too many things.
import { initializeFileLogging, traceError } from './common/log/logging';
const logDispose: { dispose: () => void }[] = [];
initializeFileLogging(process.env.VSC_PYTHON_DEBUGGER_LOG_FILE, logDispose);

// Do not move this line of code (used to measure extension load times).
const stopWatch = new StopWatch();

//===============================================
// loading starts here

import { ProgressLocation, ProgressOptions, window, workspace } from 'vscode';
import { createDeferred } from './common/utils/async';
import { Common } from './common/utils/localize';
import { activateLegacy, initializeGlobals, initializeStandard } from './extensionInit';
import { sendStartupTelemetry } from './startupTelemetry';
import { ExtensionState, IStartupDurations } from './types';
import { IExtensionApi } from './apiTypes';
import { buildApi } from './api';
import { IServiceContainer } from './debugger/ioc/types';
import { IExtensionContext } from './common/types';
import { ActivationResult } from './components';

durations.codeLoadingTime = stopWatch.elapsedTime;

//===============================================
// loading ends here

// These persist between activations:
let activatedServiceContainer: IServiceContainer | undefined;

/////////////////////////////
// public functions

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: IExtensionContext): Promise<IExtensionApi> {
    let api: IExtensionApi;
    let ready: Promise<void>;
    try {
        context.subscriptions.push(
            workspace.onDidGrantWorkspaceTrust(async () => {
                deactivate();
                await activate(context);
            }),
        );
        [api, ready] = await activateUnsafe(context, stopWatch, durations);
    } catch (ex) {
        // We want to completely handle the error
        // before notifying VS Code.
        await handleError(ex as Error);
        throw ex; // re-raise
    }
    // Send the "success" telemetry only if activation did not fail.
    // Otherwise Telemetry is send via the error handler.

    sendStartupTelemetry(ready, durations, stopWatch)
        // Run in the background.
        .ignoreErrors();
    return api;
}

// this method is called when your extension is deactivated
export function deactivate() {}

/////////////////////////////
// activation helpers

async function activateUnsafe(
    context: IExtensionContext,
    startupStopWatch: StopWatch,
    startupDurations: IStartupDurations,
): Promise<[IExtensionApi, Promise<void>, IServiceContainer]> {
    // Add anything that we got from initializing logs to dispose.
    context.subscriptions.push(...logDispose);

    const activationDeferred = createDeferred<void>();
    displayProgress(activationDeferred.promise);
    startupDurations.startActivateTime = startupStopWatch.elapsedTime;

    //===============================================
    // activation starts here

    // First we initialize.
    const ext = initializeGlobals(context);
    activatedServiceContainer = ext.legacyIOC.serviceContainer;
    // Note standard utils especially experiment and platform code are fundamental to the extension
    // and should be available before we activate anything else.Hence register them first.
    initializeStandard(ext);

    // Then we finish activating.
    const componentsActivated = await activateComponents(ext);

    const nonBlocking = componentsActivated.map((r) => r.fullyReady);
    const activationPromise = (async () => {
        await Promise.all(nonBlocking);
    })();

    //===============================================
    // activation ends here

    startupDurations.totalActivateTime = startupStopWatch.elapsedTime - startupDurations.startActivateTime;
    activationDeferred.resolve();

    const api = buildApi(activationPromise, ext.legacyIOC.serviceManager, ext.legacyIOC.serviceContainer);

    return [api, activationPromise, ext.legacyIOC.serviceContainer];
}

function displayProgress(promise: Promise<any>) {
    const progressOptions: ProgressOptions = { location: ProgressLocation.Window, title: Common.loadingExtension };
    window.withProgress(progressOptions, () => promise);
}

/////////////////////////////
// error handling

async function handleError(ex: Error) {
    window.showErrorMessage(
        "Extension activation failed, run the 'Developer: Toggle Developer Tools' command for more information.",
    );
    traceError('extension activation failed', ex);
}

export async function activateComponents(
    // `ext` is passed to any extra activation funcs.
    ext: ExtensionState,
): Promise<ActivationResult[]> {
    // Note that each activation returns a promise that resolves
    // when that activation completes.  However, it might have started
    // some non-critical background operations that do not block
    // extension activation but do block use of the extension "API".
    // Each component activation can't just resolve an "inner" promise
    // for those non-critical operations because `await` (and
    // `Promise.all()`, etc.) will flatten nested promises.  Thus
    // activation resolves `ActivationResult`, which can safely wrap
    // the "inner" promise.

    // TODO: As of now activateLegacy() registers various classes which might
    // be required while activating components. Once registration from
    // activateLegacy() are moved before we activate other components, we can
    // activate them in parallel with the other components.
    // https://github.com/microsoft/vscode-python/issues/15380
    // These will go away eventually once everything is refactored into components.
    const legacyActivationResult = await activateLegacy(ext);

    return Promise.all([legacyActivationResult]);
}
