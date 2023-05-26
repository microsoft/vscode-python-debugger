# Debugpy extension for Visual Studio Code

A [Visual Studio Code(https://code.visualstudio.com/) [extension](https://marketplace.visualstudio.com/VSCode) that supports Python debugging with debugpy. debugpy provides a seamless debugging experience by allowing you to set breakpoints, step through code, inspect variables, and perform other essential debugging tasks. The debugy extension offers debugging support for various types of Python applications including scripts, web applications, remote processes, and multi-threaded processes. 

Note: 
- The Python extension offers the debugpy extension as an optional installation, including it during the setup process.
- This extension is supported for all [actively supported versions](https://devguide.python.org/#status-of-python-branches) of the Python language (i.e., Python >= 3.7).

## Usage

Once installed in Visual Studio Code, debugpy will be automatically activated when you open a Python file.

## Disabling the Debugpy extension
If you want to disable the Debugpy extension, you can [disable this extension](https://code.visualstudio.com/docs/editor/extension-marketplace#_disable-an-extension) per workspace in Visual Studio Code.

## Commands

| Command                | Description                       |
| ---------------------- | --------------------------------- |
| Debugpy: viewOutput | Show the debugpy extension output. |
| Debugpy: clearCacheAndReload | Allows you to clear the global values set in the extension. |
| Debugpy: debugInTerminal | Allows you to debug a simple Python file in the terminal. |
