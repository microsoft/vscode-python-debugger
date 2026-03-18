# Copilot Instructions for vscode-python-debugger

## Learnings

-   Always use `run.executable` (the actual Python binary path) instead of `activatedRun.executable` for interpreter identification in `getInterpreterDetails`, `getSettingsPythonPath`, and `getExecutableCommand`. `activatedRun.executable` may be a wrapper command (e.g. `pixi run python`) set by environment managers like pixi or conda, which breaks the debugger if used as a replacement for the binary. (1)
