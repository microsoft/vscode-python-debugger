# Python Debugger extension for Visual Studio Code

A [Visual Studio Code](https://code.visualstudio.com/) [extension](https://marketplace.visualstudio.com/VSCode) that supports Python debugging with debugpy. Python Debugger provides a seamless debugging experience by allowing you to set breakpoints, step through code, inspect variables, and perform other essential debugging tasks. The debugy extension offers debugging support for various types of Python applications including scripts, web applications, remote processes, and multi-threaded processes. 

Note: 
- The Python extension offers the python debugger extension as an optional installation, including it during the setup process.
- This extension is supported for all [actively supported versions](https://devguide.python.org/#status-of-python-branches) of the Python language (i.e., Python >= 3.7).


## Intent and Purpose

The primary intent of this extension is to address the following crucial issues:


1. **Independence and Compatibility:** The primary aim of this extension is to offer autonomy to the bundled debugpy implementation, freeing it from dependency on the primary Python extension. This solution tackles a common problem where users encounter challenges debugging with older Python versions (e.g., Python 3.7) as the primary Python extension progresses. Users often face two choices: stick with an older Python extension version and miss out on new features, or upgrade their Python environment, which may not always be feasible. With this extension, you can selectively enable the debugger features, while keeping your main Python extension up-to-date.

2. **Platform-Specific Builds:** Unlike the main Python extension, which bundles all debugpy builds for various platforms into a single extension package, this extension provides a more streamlined approach. It delivers platform-specific builds, ensuring you only receive the components relevant to your specific platform. This reduces unnecessary overhead.

3. **Feature Parity and Ongoing Updates:** This extension replicates all the functionality available in the main Python extension. Any new features introduced in the Python extension will be added here. In the future, the main extension will transition to using this extension for these features.


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
