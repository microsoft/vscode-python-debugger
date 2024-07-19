/* eslint-disable global-require */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import TelemetryReporter from '@vscode/extension-telemetry';

import { isTestExecution } from '../common/constants';
import { StopWatch } from '../common/utils/stopWatch';
import { ConsoleType, TriggerType } from '../types';
import { DebugConfigurationType } from '../debugger/types';
import { EventName } from './constants';
import { isPromise } from '../common/utils/async';
import { getTelemetryReporter } from './reporter';
import { DebugConfiguration } from 'vscode';

/**
 * Checks whether telemetry is supported.
 * Its possible this function gets called within Debug Adapter, vscode isn't available in there.
 * Within DA, there's a completely different way to send telemetry.
 * @returns {boolean}
 */
function isTelemetrySupported(): boolean {
    try {
        const vsc = require('vscode');
        const reporter = require('@vscode/extension-telemetry');

        return vsc !== undefined && reporter !== undefined;
    } catch {
        return false;
    }
}

const sharedProperties: Record<string, unknown> = {};

let telemetryReporter: TelemetryReporter | undefined;

export function clearTelemetryReporter(): void {
    telemetryReporter = undefined;
}

export function sendTelemetryEvent<P extends IEventNamePropertyMapping, E extends keyof P>(
    eventName: E,
    measuresOrDurationMs?: Record<string, number> | number,
    properties?: P[E],
    ex?: Error,
): void {
    if (isTestExecution() || !isTelemetrySupported()) {
        return;
    }
    const reporter = getTelemetryReporter(telemetryReporter);
    const measures =
        typeof measuresOrDurationMs === 'number'
            ? { duration: measuresOrDurationMs }
            : measuresOrDurationMs || undefined;
    const customProperties: Record<string, string> = {};
    const eventNameSent = eventName as string;

    if (properties) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = properties as any;
        Object.getOwnPropertyNames(data).forEach((prop) => {
            if (data[prop] === undefined || data[prop] === null) {
                return;
            }
            try {
                // If there are any errors in serializing one property, ignore that and move on.
                // Else nothing will be sent.
                switch (typeof data[prop]) {
                    case 'string':
                        customProperties[prop] = data[prop];
                        break;
                    case 'object':
                        customProperties[prop] = 'object';
                        break;
                    default:
                        customProperties[prop] = data[prop].toString();
                        break;
                }
            } catch (exception) {
                console.error(`Failed to serialize ${prop} for ${String(eventName)}`, exception);
            }
        });
    }

    // Add shared properties to telemetry props (we may overwrite existing ones).
    Object.assign(customProperties, sharedProperties);

    if (ex) {
        const errorProps = {
            errorName: ex.name,
            errorStack: ex.stack ?? '',
        };
        Object.assign(customProperties, errorProps);
        reporter.sendTelemetryErrorEvent(eventNameSent, customProperties, measures);
    } else {
        reporter.sendTelemetryEvent(eventNameSent, customProperties, measures);
    }

    if (process.env && process.env.VSC_PYTHON_LOG_TELEMETRY) {
        console.info(
            `Telemetry Event : ${eventNameSent} Measures: ${JSON.stringify(measures)} Props: ${JSON.stringify(
                customProperties,
            )} `,
        );
    }
}

// Type-parameterized form of MethodDecorator in lib.es5.d.ts.
type TypedMethodDescriptor<T> = (
    target: unknown,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> | void;

// The following code uses "any" in many places, as TS does not have rich support
// for typing decorators. Specifically, while it is possible to write types which
// encode the signature of the wrapped function, TS fails to actually infer the
// type of "this" and the signature at call sites, instead choosing to infer
// based on other hints (like the closure parameters), which ends up making it
// no safer than "any" (and sometimes misleading enough to be more unsafe).

/**
 * Decorates a method, sending a telemetry event with the given properties.
 * @param eventName The event name to send.
 * @param properties Properties to send with the event; must be valid for the event.
 * @param captureDuration True if the method's execution duration should be captured.
 * @param failureEventName If the decorated method returns a Promise and fails, send this event instead of eventName.
 * @param lazyProperties A static function on the decorated class which returns extra properties to add to the event.
 * This can be used to provide properties which are only known at runtime (after the decorator has executed).
 * @param lazyMeasures A static function on the decorated class which returns extra measures to add to the event.
 * This can be used to provide measures which are only known at runtime (after the decorator has executed).
 */
export function captureTelemetry<This, P extends IEventNamePropertyMapping, E extends keyof P>(
    eventName: E,
    properties?: P[E],
    captureDuration = true,
    failureEventName?: E,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lazyProperties?: (obj: This, result?: any) => P[E],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lazyMeasures?: (obj: This, result?: any) => Record<string, number>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): TypedMethodDescriptor<(this: This, ...args: any[]) => any> {
    return function (
        _target: unknown,
        _propertyKey: string | symbol,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        descriptor: TypedPropertyDescriptor<(this: This, ...args: any[]) => any>,
    ) {
        const originalMethod = descriptor.value!;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        descriptor.value = function (this: This, ...args: any[]) {
            // Legacy case; fast path that sends event before method executes.
            // Does not set "failed" if the result is a Promise and throws an exception.
            if (!captureDuration && !lazyProperties && !lazyMeasures) {
                sendTelemetryEvent(eventName, undefined, properties);

                return originalMethod.apply(this, args);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getProps = (result?: any) => {
                if (lazyProperties) {
                    return { ...properties, ...lazyProperties(this, result) };
                }
                return properties;
            };

            const stopWatch = captureDuration ? new StopWatch() : undefined;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getMeasures = (result?: any) => {
                const measures = stopWatch ? { duration: stopWatch.elapsedTime } : undefined;
                if (lazyMeasures) {
                    return { ...measures, ...lazyMeasures(this, result) };
                }
                return measures;
            };

            const result = originalMethod.apply(this, args);

            // If method being wrapped returns a promise then wait for it.
            if (result && isPromise(result)) {
                result
                    .then((data) => {
                        sendTelemetryEvent(eventName, getMeasures(data), getProps(data));
                        return data;
                    })
                    .catch((ex) => {
                        const failedProps: P[E] = { ...getProps(), failed: true } as P[E] & FailedEventType;
                        sendTelemetryEvent(failureEventName || eventName, getMeasures(), failedProps, ex);
                    });
            } else {
                sendTelemetryEvent(eventName, getMeasures(result), getProps(result));
            }

            return result;
        };

        return descriptor;
    };
}

// function sendTelemetryWhenDone<T extends IDSMappings, K extends keyof T>(eventName: K, properties?: T[K]);
export function sendTelemetryWhenDone<P extends IEventNamePropertyMapping, E extends keyof P>(
    eventName: E,
    promise: Promise<unknown> | Thenable<unknown>,
    stopWatch?: StopWatch,
    properties?: P[E],
): void {
    stopWatch = stopWatch || new StopWatch();
    if (typeof promise.then === 'function') {
        (promise as Promise<unknown>).then(
            (data) => {
                sendTelemetryEvent(eventName, stopWatch!.elapsedTime, properties);
                return data;
            },
            (ex) => {
                sendTelemetryEvent(eventName, stopWatch!.elapsedTime, properties, ex);
                return Promise.reject(ex);
            },
        );
    } else {
        throw new Error('Method is neither a Promise nor a Thenable');
    }
}

/**
 * Map all shared properties to their data types.
 */
export interface ISharedPropertyMapping {
    /**
     * For every DS telemetry we would like to know the type of Notebook Editor used when doing something.
     */
    ['ds_notebookeditor']: undefined | 'old' | 'custom' | 'native';

    /**
     * For every telemetry event from the extension we want to make sure we can associate it with install
     * source. We took this approach to work around very limiting query performance issues.
     */
    ['installSource']: undefined | 'marketPlace' | 'pythonCodingPack';
}

type FailedEventType = { failed: true };

// Map all events to their properties
export interface IEventNamePropertyMapping {
    /**
     * Telemetry event sent with details just after editor loads
     */
    /* __GDPR__
       "debug.success_activation" : {
          "codeloadingtime" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "errorname" : { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth", "owner": "paulacamargo25" }
       }
     */
    [EventName.DEBUG_SUCCESS_ACTIVATION]: {};
    /**
     * Telemetry event sent when debug in terminal button was used to debug current file.
     */
    /* __GDPR__
        "debug_in_terminal_button" : { "owner": "paulacamargo25" }
    */
    [EventName.DEBUG_IN_TERMINAL_BUTTON]: never | undefined;
    /**
     * Telemetry event sent when debug using launch.json button was used to debug.
     */
    /* __GDPR__
        "debug_using_launch_config_button" : { "owner": "paulacamargo25" }
    */
    [EventName.DEBUG_USING_LAUNCH_CONFIG_BUTTON]: never | undefined;
    /**
     * Telemetry event captured when debug adapter executable is created
     */
    /* __GDPR__
       "debug_adapter.using_wheels_path" : {
          "usingwheels" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" }
       }
     */

    [EventName.DEBUG_ADAPTER_USING_WHEELS_PATH]: {
        /**
         * Carries boolean
         * - `true` if path used for the adapter is the debugger with wheels.
         * - `false` if path used for the adapter is the source only version of the debugger.
         */
        usingWheels: boolean;
    };
    /**
     * Telemetry captured before starting debug session.
     */
    /* __GDPR__
       "debug_session.start" : {
          "duration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "trigger" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "owner": "paulacamargo25" },
          "console" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "owner": "paulacamargo25" }
       }
     */
    [EventName.DEBUG_SESSION_START]: {
        /**
         * Trigger for starting the debugger.
         * - `launch`: Launch/start new code and debug it.
         * - `attach`: Attach to an exiting python process (remote debugging).
         * - `test`: Debugging python tests.
         *
         * @type {TriggerType}
         */
        trigger: TriggerType;
        /**
         * Type of console used.
         *  -`internalConsole`: Use VS Code debug console (no shells/terminals).
         * - `integratedTerminal`: Use VS Code terminal.
         * - `externalTerminal`: Use an External terminal.
         *
         * @type {ConsoleType}
         */
        console?: ConsoleType;
    };
    /**
     * Telemetry captured when debug session runs into an error.
     */
    /* __GDPR__
       "debug_session.error" : {
          "duration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "trigger" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "owner": "paulacamargo25" },
          "console" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "owner": "paulacamargo25" }

       }
     */
    [EventName.DEBUG_SESSION_ERROR]: {
        /**
         * Trigger for starting the debugger.
         * - `launch`: Launch/start new code and debug it.
         * - `attach`: Attach to an exiting python process (remote debugging).
         * - `test`: Debugging python tests.
         *
         * @type {TriggerType}
         */
        trigger: TriggerType;
        /**
         * Type of console used.
         *  -`internalConsole`: Use VS Code debug console (no shells/terminals).
         * - `integratedTerminal`: Use VS Code terminal.
         * - `externalTerminal`: Use an External terminal.
         *
         * @type {ConsoleType}
         */
        console?: ConsoleType;
        error?: Error;
    };
    /**
     * Telemetry captured after stopping debug session.
     */
    /* __GDPR__
       "debug_session.stop" : {
          "duration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "trigger" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "owner": "paulacamargo25" },
          "console" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "owner": "paulacamargo25" }
       }
     */
    [EventName.DEBUG_SESSION_STOP]: {
        /**
         * Trigger for starting the debugger.
         * - `launch`: Launch/start new code and debug it.
         * - `attach`: Attach to an exiting python process (remote debugging).
         * - `test`: Debugging python tests.
         *
         * @type {TriggerType}
         */
        trigger: TriggerType;
        /**
         * Type of console used.
         *  -`internalConsole`: Use VS Code debug console (no shells/terminals).
         * - `integratedTerminal`: Use VS Code terminal.
         * - `externalTerminal`: Use an External terminal.
         *
         * @type {ConsoleType}
         */
        console?: ConsoleType;
    };
    /**
     * Telemetry captured when user code starts running after loading the debugger.
     */
    /* __GDPR__
       "debug_session.user_code_running" : {
          "duration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "trigger" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "owner": "paulacamargo25" },
          "console" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "owner": "paulacamargo25" }
       }
     */
    [EventName.DEBUG_SESSION_USER_CODE_RUNNING]: {
        /**
         * Trigger for starting the debugger.
         * - `launch`: Launch/start new code and debug it.
         * - `attach`: Attach to an exiting python process (remote debugging).
         * - `test`: Debugging python tests.
         *
         * @type {TriggerType}
         */
        trigger: TriggerType;
        /**
         * Type of console used.
         *  -`internalConsole`: Use VS Code debug console (no shells/terminals).
         * - `integratedTerminal`: Use VS Code terminal.
         * - `externalTerminal`: Use an External terminal.
         *
         * @type {ConsoleType}
         */
        console?: ConsoleType;
    };
    /**
     * Telemetry captured when starting the debugger.
     */
    /* __GDPR__
       "debugger" : {
          "trigger" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "console" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "hasenvvars": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "hasargs": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "django": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "fastapi": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "flask": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "jinja": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "islocalhost": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "ismodule": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "issudo": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "stoponentry": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "showreturnvalue": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "pyramid": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "subprocess": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "watson": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "pyspark": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "gevent": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "scrapy": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" }
       }
     */
    [EventName.DEBUGGER]: {
        /**
         * Trigger for starting the debugger.
         * - `launch`: Launch/start new code and debug it.
         * - `attach`: Attach to an exiting python process (remote debugging).
         * - `test`: Debugging python tests.
         *
         * @type {TriggerType}
         */
        trigger: TriggerType;
        /**
         * Type of console used.
         *  -`internalConsole`: Use VS Code debug console (no shells/terminals).
         * - `integratedTerminal`: Use VS Code terminal.
         * - `externalTerminal`: Use an External terminal.
         *
         * @type {ConsoleType}
         */
        console?: ConsoleType;
        /**
         * Whether user has defined environment variables.
         * Could have been defined in launch.json or the env file (defined in `settings.json`).
         * Default `env file` is `.env` in the workspace folder.
         *
         * @type {boolean}
         */
        hasEnvVars: boolean;
        /**
         * Whether there are any CLI arguments that need to be passed into the program being debugged.
         *
         * @type {boolean}
         */
        hasArgs: boolean;
        /**
         * Whether the user is debugging `django`.
         *
         * @type {boolean}
         */
        django: boolean;
        /**
         * Whether the user is debugging `fastapi`.
         *
         * @type {boolean}
         */
        fastapi: boolean;
        /**
         * Whether the user is debugging `flask`.
         *
         * @type {boolean}
         */
        flask: boolean;
        /**
         * Whether the user is debugging `jinja` templates.
         *
         * @type {boolean}
         */
        jinja: boolean;
        /**
         * Whether user is attaching to a local python program (attach scenario).
         *
         * @type {boolean}
         */
        isLocalhost: boolean;
        /**
         * Whether debugging a module.
         *
         * @type {boolean}
         */
        isModule: boolean;
        /**
         * Whether debugging with `sudo`.
         *
         * @type {boolean}
         */
        isSudo: boolean;
        /**
         * Whether required to stop upon entry.
         *
         * @type {boolean}
         */
        stopOnEntry: boolean;
        /**
         * Whether required to display return types in debugger.
         *
         * @type {boolean}
         */
        showReturnValue: boolean;
        /**
         * Whether debugging `pyramid`.
         *
         * @type {boolean}
         */
        pyramid: boolean;
        /**
         * Whether debugging a subprocess.
         *
         * @type {boolean}
         */
        subProcess: boolean;
        /**
         * Whether debugging `watson`.
         *
         * @type {boolean}
         */
        watson: boolean;
        /**
         * Whether debugging `pyspark`.
         *
         * @type {boolean}
         */
        pyspark: boolean;
        /**
         * Whether using `gevent` when debugging.
         *
         * @type {boolean}
         */
        gevent: boolean;
        /**
         * Whether debugging `scrapy`.
         *
         * @type {boolean}
         */
        scrapy: boolean;
        /**
         * Whether debugging with autoStartBrowser.
         *
         * @type {boolean}
         */
        autoStartBrowser: boolean;
    };
    /**
     * Telemetry event sent when attaching to child process
     */
    /* __GDPR__
       "debugger.attach_to_child_process" : {
           "duration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "owner": "paulacamargo25" }
       }
     */
    [EventName.DEBUGGER_ATTACH_TO_CHILD_PROCESS]: never | undefined;
    /**
     * Telemetry event sent when attaching to a local process.
     */
    /* __GDPR__
       "debugger.attach_to_local_process" : { "owner": "paulacamargo25" }
     */
    [EventName.DEBUGGER_ATTACH_TO_LOCAL_PROCESS]: never | undefined;
    /**
     * Telemetry sent after building configuration for debugger
     */
    /* __GDPR__
       "debugger.configuration.prompts" : {
          "configurationtype" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "autodetecteddjangomanagepypath" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "autodetectedpyramidinipath" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "autodetectedfastapimainpypath" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "autodetectedflaskapppypath" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "manuallyenteredavalue" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" },
          "browsefilevalue" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "owner": "paulacamargo25" }
       }
     */

    [EventName.DEBUGGER_CONFIGURATION_PROMPTS]: {
        /**
         * The type of debug configuration to build configuration for
         *
         * @type {DebugConfigurationType}
         */
        configurationType: DebugConfigurationType;
        /**
         * Carries `true` if we are able to auto-detect manage.py path for Django, `false` otherwise
         *
         * @type {boolean}
         */
        autoDetectedDjangoManagePyPath?: boolean;
        /**
         * Carries `true` if we are able to auto-detect .ini file path for Pyramid, `false` otherwise
         *
         * @type {boolean}
         */
        autoDetectedPyramidIniPath?: boolean;
        /**
         * Carries `true` if we are able to auto-detect main.py path for FastAPI, `false` otherwise
         *
         * @type {boolean}
         */
        autoDetectedFastAPIMainPyPath?: boolean;
        /**
         * Carries `true` if we are able to auto-detect app.py path for Flask, `false` otherwise
         *
         * @type {boolean}
         */
        autoDetectedFlaskAppPyPath?: boolean;
        /**
         * Carries `true` if user manually entered the required path for the app
         * (path to `manage.py` for Django, path to `.ini` for Pyramid, path to `app.py` for Flask), `false` otherwise
         *
         * @type {boolean}
         */
        manuallyEnteredAValue?: boolean;
        /**
         * Carries `true` if the user choose a file from the folder picker, `false` otherwise
         *
         * @type {boolean}
         */
        browsefilevalue?: boolean;
    };
    /**
     * Telemetry event sent when providing completion provider in launch.json. It is sent just *after* inserting the completion.
     */
    /* __GDPR__
       "debugger.configuration.prompts.in.launch.json" : { "owner": "paulacamargo25" }
     */
    [EventName.DEBUGGER_CONFIGURATION_PROMPTS_IN_LAUNCH_JSON]: never | undefined;
    /**
     * Telemetry event sent when substituting Environment variables to calculate value of variables
     */
    /* __GDPR__
       "envfile_variable_substitution" : { "owner": "karthiknadig" }
     */
    [EventName.ENVFILE_VARIABLE_SUBSTITUTION]: never | undefined;
    /**
     * Telemetry event sent when the user use the report issue command.
     */
    /* __GDPR__
      "use_report_issue_command" : { "owner": "paulacamargo25" }
     */
    [EventName.USE_REPORT_ISSUE_COMMAND]: unknown;
    /**
     * Telemetry event sent when providing dynamic configuration for debugger
     */
    /* __GDPR__
       "debugger_dynamic_config" : { "owner": "paulacamargo25" }
     */
    [EventName.DEBUGGER_DYNAMIC_CONFIGURATION]: {
        /**
         * Providers of dynamic configurations
         *
         * @type {DebugConfiguration[]}
         */
        providers: DebugConfiguration[];
    };
    /**
     * Telemetry event sent when the debugger is running with a non supports python versions minor than 3.7.
     */
    /* __GDPR__
       "DEBUGGER_PYTHON_37_DEPRECATED" : { "owner": "paulacamargo25" }
     */
    [EventName.DEBUGGER_PYTHON_37_DEPRECATED]: never | undefined;
    /**
     * Telemetry event sent when displaying inline values in the debugger.
     */
    /* __GDPR__
       "DEBUGGER_SHOW_PYTHON_INLINE_VALUES" : { "owner": "paulacamargo25" }
     */
    [EventName.DEBUGGER_SHOW_PYTHON_INLINE_VALUES]: never | undefined;
}
