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
    export const selectConfiguration = {
        title: l10n.t('Select a debug configuration'),
        placeholder: l10n.t('Debug Configuration'),
    };
    export const launchJsonCompletions = {
        label: l10n.t('Python'),
        description: l10n.t('Select a Python debug configuration'),
    };

    export namespace file {
        export const snippet = {
            name: l10n.t('Python: Current File'),
        };

        export const selectConfiguration = {
            label: l10n.t('Python File'),
            description: l10n.t('Debug the currently active Python file'),
        };
    }
    export namespace module {
        export const snippet = {
            name: l10n.t('Python: Module'),
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
            name: l10n.t('Python: Remote Attach'),
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
            name: l10n.t('Python: Attach using Process Id'),
        };

        export const selectConfiguration = {
            label: l10n.t('Attach using Process ID'),
            description: l10n.t('Attach to a local process'),
        };
    }
    export namespace django {
        export const snippet = {
            name: l10n.t('Python: Django'),
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
            name: l10n.t('Python: FastAPI'),
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
            name: l10n.t('Python: Flask'),
        };

        export const selectConfiguration = {
            label: l10n.t('Flask'),
            description: l10n.t('Launch and debug a Flask web application'),
        };
        export const enterAppPathOrNamePath = {
            title: l10n.t('Debug Flask'),
            prompt: l10n.t('Python: Flask'),
            invalid: l10n.t('Enter a valid name'),
        };
    }
    export namespace pyramid {
        export const snippet = {
            name: l10n.t('Python: Pyramid Application'),
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

export namespace Diagnostics {
    export const warnSourceMaps = l10n.t(
        'Source map support is enabled in the Python Extension, this will adversely impact performance of the extension.',
    );
    export const disableSourceMaps = l10n.t('Disable Source Map Support');

    export const warnBeforeEnablingSourceMaps = l10n.t(
        'Enabling source map support in the Python Extension will adversely impact performance of the extension.',
    );
    export const enableSourceMapsAndReloadVSC = l10n.t('Enable and reload Window.');
    export const lsNotSupported = l10n.t(
        'Your operating system does not meet the minimum requirements of the Python Language Server. Reverting to the alternative autocompletion provider, Jedi.',
    );
    export const invalidPythonPathInDebuggerSettings = l10n.t(
        'You need to select a Python interpreter before you start debugging.\n\nTip: click on "Select Interpreter" in the status bar.',
    );
    export const invalidPythonPathInDebuggerLaunch = l10n.t('The Python path in your debug configuration is invalid.');
    export const invalidDebuggerTypeDiagnostic = l10n.t(
        'Your launch.json file needs to be updated to change the "pythonExperimental" debug configurations to use the "python" debugger type, otherwise Python debugging may not work. Would you like to automatically update your launch.json file now?',
    );
    export const consoleTypeDiagnostic = l10n.t(
        'Your launch.json file needs to be updated to change the console type string from "none" to "internalConsole", otherwise Python debugging may not work. Would you like to automatically update your launch.json file now?',
    );
    export const justMyCodeDiagnostic = l10n.t(
        'Configuration "debugStdLib" in launch.json is no longer supported. It\'s recommended to replace it with "justMyCode", which is the exact opposite of using "debugStdLib". Would you like to automatically update your launch.json file to do that?',
    );
    export const yesUpdateLaunch = l10n.t('Yes, update launch.json');
    export const invalidTestSettings = l10n.t(
        'Your settings needs to be updated to change the setting "python.unitTest." to "python.testing.", otherwise testing Python code using the extension may not work. Would you like to automatically update your settings now?',
    );
    export const updateSettings = l10n.t('Yes, update settings');
    export const checkIsort5UpgradeGuide = l10n.t(
        'We found outdated configuration for sorting imports in this workspace. Check the [isort upgrade guide](https://aka.ms/AA9j5x4) to update your settings.',
    );
    export const pylanceDefaultMessage = l10n.t(
        "The Python extension now includes Pylance to improve completions, code navigation, overall performance and much more! You can learn more about the update and learn how to change your language server [here](https://aka.ms/new-python-bundle).\n\nRead Pylance's license [here](https://marketplace.visualstudio.com/items/ms-python.vscode-pylance/license).",
    );
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