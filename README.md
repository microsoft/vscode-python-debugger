# Python Debugger extension for Visual Studio Code

A [Visual Studio Code](https://code.visualstudio.com/) [extension](https://marketplace.visualstudio.com/VSCode) that supports Python debugging with debugpy. Python Debugger provides a seamless debugging experience by allowing you to set breakpoints, step through code, inspect variables, and perform other essential debugging tasks. The debugy extension offers debugging support for various types of Python applications including scripts, web applications, remote processes, and multi-threaded processes. 

Note: 
- The Python extension offers the python debugger extension as an optional installation, including it during the setup process.
- This extension is supported for all [actively supported versions](https://devguide.python.org/#status-of-python-branches) of the Python language (i.e., Python >= 3.7).


## Purpose

The main intent of this extension is to offer:

1. **Independence and Compatibility:** The Python Debugger extension aims to separate the debugging functionality from the main Python extension to prevent compatibility issues. This ensures that even as the Python extension drops support for older Python versions (e.g., Python 3.7), you can continue debugging projects with those versions without downgrading your Python extension. This allows you to access new features and bug fixes while keeping your debugging capabilities intact.

2. **Platform-Specific Builds:** Unlike the main Python extension, which bundles all debugpy builds for various platforms into a single extension package, the Python Debugger extension provides a more streamlined approach: it delivers platform-specific builds, ensuring you only receive the components relevant to your specific operating system. This reduces download times and unnecessary overhead.

3. **Feature Parity and Ongoing Updates:** This extension replicates all the functionality available in the main Python extension, and more. Going forward, any new debugger features will be added to this extension. In the future, the Python extension will no longer offer debugging support on its own, and we will transition all debugging support to this extension for all debugging functionality.


## Usage

Once installed in Visual Studio Code, python-debugger will be automatically activated when you open a Python file.

## Disabling the Python Debugger extension
If you want to disable the Python Debugger extension, you can [disable this extension](https://code.visualstudio.com/docs/editor/extension-marketplace#_disable-an-extension) per workspace in Visual Studio Code.

## Commands

| Command                | Description                       |
| ---------------------- | --------------------------------- |
| Python Debugger: viewOutput | Show the Python Debugger Extension output. |
| Python Debugger: clearCacheAndReload | Allows you to clear the global values set in the extension. |
| Python Debugger: debugInTerminal | Allows you to debug a simple Python file in the terminal. |

## Data and telemetry
The Debubpy Extension for Visual Studio Code collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](https://privacy.microsoft.com/privacystatement) to learn more. This extension respects the `telemetry.enableTelemetry` setting which you can learn more about at https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting.
