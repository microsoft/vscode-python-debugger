// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { l10n } from 'vscode';

export namespace AttachProcess {
    export const attachTitle = l10n.t('Attach to process');
    export const selectProcessPlaceholder = l10n.t('Select the process to attach to');
    export const noProcessSelected = l10n.t('No process selected');
    export const refreshList = l10n.t('Refresh process list');
}

export namespace DebugConfigStrings {
    export const debugStopped = l10n.t('Debug Stopped');
    export const selectConfiguration = {
        title: l10n.t('Select a debug configuration'),
        placeholder: l10n.t('Debug Configuration'),
    };
    export const launchJsonCompletions = {
        label: l10n.t('Python Debugger'),
        description: l10n.t('Select a Python Debugger debug configuration'),
    };
    export namespace file {
        export const snippet = {
            name: l10n.t('Python Debugger: Current File'),
        };
        export const selectConfiguration = {
            label: l10n.t('Python File'),
            description: l10n.t('Debug the currently active Python file'),
        };
    }
    export namespace fileWithArgs {
        export const snippet = {
            name: l10n.t('Python Debugger: Current File with Arguments'),
        };
        export const selectConfiguration = {
            label: l10n.t('Python File with Arguments'),
            description: l10n.t('Debug the currently active Python file with arguments'),
        };
    }
    export namespace module {
        export const snippet = {
            name: l10n.t('Python Debugger: Module'),
            default: l10n.t('enter-your-module-name'),
        };
        export const selectConfiguration = {
            label: l10n.t('Module'),
            description: l10n.t("Debug a Python module by invoking it with '-m'"),
        };
        export const enterModule = {
            title: l10n.t('Debug Module'),
            prompt: l10n.t('Enter a Python module/package name'),
            default: l10n.t('enter-your-module-name'),
            invalid: l10n.t('Enter a valid module name'),
        };
    }
    export namespace attach {
        export const snippet = {
            name: l10n.t('Python Debugger: Remote Attach'),
        };
        export const selectConfiguration = {
            label: l10n.t('Remote Attach'),
            description: l10n.t('Attach to a remote debug server'),
        };
        export const enterRemoteHost = {
            title: l10n.t('Remote Debugging'),
            prompt: l10n.t('Enter a valid host name or IP address'),
            invalid: l10n.t('Enter a valid host name or IP address'),
        };
        export const enterRemotePort = {
            title: l10n.t('Remote Debugging'),
            prompt: l10n.t('Enter the port number that the debug server is listening on'),
            invalid: l10n.t('Enter a valid port number'),
        };
    }
    export namespace attachPid {
        export const snippet = {
            name: l10n.t('Python Debugger: Attach using Process Id'),
        };
        export const selectConfiguration = {
            label: l10n.t('Attach using Process ID'),
            description: l10n.t('Attach to a local process'),
        };
    }
    export namespace django {
        export const snippet = {
            name: l10n.t('Python Debugger: Django'),
        };
        export const selectConfiguration = {
            label: l10n.t('Django'),
            description: l10n.t('Launch and debug a Django web application'),
        };
        export const enterManagePyPath = {
            title: l10n.t('Debug Django'),
            prompt: l10n.t(
                "Enter the path to manage.py ('${workspaceFolderToken}' points to the root of the current workspace folder)",
            ),
            invalid: l10n.t('Enter a valid Python file path'),
        };
    }
    export namespace fastapi {
        export const snippet = {
            name: l10n.t('Python Debugger: FastAPI'),
        };
        export const selectConfiguration = {
            label: l10n.t('FastAPI'),
            description: l10n.t('Launch and debug a FastAPI web application'),
        };
        export const enterAppPathOrNamePath = {
            title: l10n.t('Debug FastAPI'),
            prompt: l10n.t("Enter the path to the application, e.g. 'main.py' or 'main'"),
            invalid: l10n.t('Enter a valid name'),
        };
    }
    export namespace flask {
        export const snippet = {
            name: l10n.t('Python Debugger: Flask'),
        };
        export const selectConfiguration = {
            label: l10n.t('Flask'),
            description: l10n.t('Launch and debug a Flask web application'),
        };
        export const enterAppPathOrNamePath = {
            title: l10n.t('Debug Flask'),
            prompt: l10n.t('Python Debugger: Flask'),
            invalid: l10n.t('Enter a valid name'),
        };
    }
    export namespace pyramid {
        export const snippet = {
            name: l10n.t('Python Debugger: Pyramid Application'),
        };
        export const selectConfiguration = {
            label: l10n.t('Pyramid'),
            description: l10n.t('Launch and debug a Pyramid web application'),
        };
        export const enterDevelopmentIniPath = {
            title: l10n.t('Debug Pyramid'),
            invalid: l10n.t('Enter a valid file path'),
        };
    }
}

export namespace Common {
    export const loadingExtension = l10n.t('Python Debugger extension loading...');
    export const doNotShowAgain = l10n.t('Do not show again');
    export const moreInfo = l10n.t('More Info');
    export const noIWillDoItLater = l10n.t('No, I will do it later');
    export const openLaunch = l10n.t('Open launch.json');
    export const selectPythonInterpreter = l10n.t('Select Python Interpreter');
}

export namespace Interpreters {
    export const changePythonInterpreter = l10n.t('Change Python Interpreter');
}

export namespace OutdatedDebugger {
    export const outdatedDebuggerMessage = l10n.t(
        'We noticed you are attaching to ptvsd (Python debugger), which was deprecated on May 1st, 2020. Please switch to [debugpy](https://aka.ms/migrateToDebugpy).',
    );
}

export namespace Logging {
    export const currentWorkingDirectory = l10n.t('cwd:');
}

export namespace pickArgsInput {
    export const title = l10n.t('Command Line Arguments');
    export const prompt = l10n.t('Enter the command line arguments you want to pass to the program');
}
