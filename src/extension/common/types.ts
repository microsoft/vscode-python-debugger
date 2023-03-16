// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import {
    ExtensionContext,
    Memento,
    Uri,
} from 'vscode';
import { EnvironmentVariables } from './variables/types';

export interface IDisposable {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispose(): void | undefined | Promise<void>;
}

export const IDisposableRegistry = Symbol('IDisposableRegistry');
export type IDisposableRegistry = IDisposable[];
export const IMemento = Symbol('IGlobalMemento');
export const GLOBAL_MEMENTO = Symbol('IGlobalMemento');
export const WORKSPACE_MEMENTO = Symbol('IWorkspaceMemento');

export type Resource = Uri | undefined;

export interface IPersistentState<T> {
    /**
     * Storage is exposed in this type to make sure folks always use persistent state
     * factory to access any type of storage as all storages are tracked there.
     */
    readonly storage: Memento;
    readonly value: T;
    updateValue(value: T): Promise<void>;
}

// export type ReadWrite<T> = {
//     -readonly [P in keyof T]: T[P];
// };

export const IPersistentStateFactory = Symbol('IPersistentStateFactory');

export interface IPersistentStateFactory {
    createGlobalPersistentState<T>(key: string, defaultValue?: T, expiryDurationMs?: number): IPersistentState<T>;
    createWorkspacePersistentState<T>(key: string, defaultValue?: T, expiryDurationMs?: number): IPersistentState<T>;
}

// export type ExecutionInfo = {
//     execPath?: string;
//     moduleName?: string;
//     args: string[];
//     product?: Product;
//     useShell?: boolean;
// };

// export enum InstallerResponse {
//     Installed,
//     Disabled,
//     Ignore,
// }

// export enum ProductInstallStatus {
//     Installed,
//     NotInstalled,
//     NeedsUpgrade,
// }

// export enum ProductType {
//     Linter = 'Linter',
//     Formatter = 'Formatter',
//     TestFramework = 'TestFramework',
//     RefactoringLibrary = 'RefactoringLibrary',
//     DataScience = 'DataScience',
//     Python = 'Python',
// }

// export enum Product {
//     pytest = 1,
//     pylint = 3,
//     flake8 = 4,
//     pycodestyle = 5,
//     pylama = 6,
//     prospector = 7,
//     pydocstyle = 8,
//     yapf = 9,
//     autopep8 = 10,
//     mypy = 11,
//     unittest = 12,
//     isort = 15,
//     black = 16,
//     bandit = 17,
//     jupyter = 18,
//     ipykernel = 19,
//     notebook = 20,
//     kernelspec = 21,
//     nbconvert = 22,
//     pandas = 23,
//     tensorboard = 24,
//     torchProfilerInstallName = 25,
//     torchProfilerImportName = 26,
//     pip = 27,
//     ensurepip = 28,
//     python = 29,
// }

// export const IInstaller = Symbol('IInstaller');

// export interface IInstaller {
//     promptToInstall(
//         product: Product,
//         resource?: InterpreterUri,
//         cancel?: CancellationToken,
//         flags?: ModuleInstallFlags,
//     ): Promise<InstallerResponse>;
//     install(
//         product: Product,
//         resource?: InterpreterUri,
//         cancel?: CancellationToken,
//         flags?: ModuleInstallFlags,
//         options?: InstallOptions,
//     ): Promise<InstallerResponse>;
//     isInstalled(product: Product, resource?: InterpreterUri): Promise<boolean>;
//     isProductVersionCompatible(
//         product: Product,
//         semVerRequirement: string,
//         resource?: InterpreterUri,
//     ): Promise<ProductInstallStatus>;
//     translateProductToModuleName(product: Product): string;
// }

// export const IRandom = Symbol('IRandom');
// export interface IRandom {
//     getRandomInt(min?: number, max?: number): number;
// }

export const ICurrentProcess = Symbol('ICurrentProcess');
export interface ICurrentProcess {
    readonly env: EnvironmentVariables;
    readonly argv: string[];
    readonly stdout: NodeJS.WriteStream;
    readonly stdin: NodeJS.ReadStream;
    readonly execPath: string;
    // eslint-disable-next-line @typescript-eslint/ban-types
    on(event: string | symbol, listener: Function): this;
}

export interface IExperiments {
    /**
     * Return `true` if experiments are enabled, else `false`.
     */
    readonly enabled: boolean;
    /**
     * Experiments user requested to opt into manually
     */
    readonly optInto: string[];
    /**
     * Experiments user requested to opt out from manually
     */
    readonly optOutFrom: string[];
}

export interface IAutoCompleteSettings {
    readonly extraPaths: string[];
}

export const IExtensionContext = Symbol('ExtensionContext');
export interface IExtensionContext extends ExtensionContext {}

// export const IExtensions = Symbol('IExtensions');
// export interface IExtensions {
//     /**
//      * All extensions currently known to the system.
//      */

//     readonly all: readonly Extension<unknown>[];

//     /**
//      * An event which fires when `extensions.all` changes. This can happen when extensions are
//      * installed, uninstalled, enabled or disabled.
//      */
//     readonly onDidChange: Event<void>;

//     /**
//      * Get an extension by its full identifier in the form of: `publisher.name`.
//      *
//      * @param extensionId An extension identifier.
//      * @return An extension or `undefined`.
//      */

//     getExtension(extensionId: string): Extension<unknown> | undefined;

//     /**
//      * Get an extension its full identifier in the form of: `publisher.name`.
//      *
//      * @param extensionId An extension identifier.
//      * @return An extension or `undefined`.
//      */
//     getExtension<T>(extensionId: string): Extension<T> | undefined;

//     /**
//      * Determines which extension called into our extension code based on call stacks.
//      */
//     determineExtensionFromCallStack(): Promise<{ extensionId: string; displayName: string }>;
// }

// /**
//  * Stores hash formats
//  */
// export interface IHashFormat {
//     number: number; // If hash format is a number
//     string: string; // If hash format is a string
// }

