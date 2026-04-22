# Copilot Instructions for vscode-python-debugger

## Learnings

-   Always use `run.executable` (the actual Python binary path) instead of `activatedRun.executable` for interpreter identification in `getInterpreterDetails`, `getSettingsPythonPath`, and `getExecutableCommand`. `activatedRun.executable` may be a wrapper command (e.g. `pixi run python`) set by environment managers like pixi or conda, which breaks the debugger if used as a replacement for the binary. (1)

## Pull Request Guidelines

- Every PR must have at least one label (e.g., `debt`, `bug`, `feature`). The "Ensure Required Labels" status check will block merging without one.
- Always enable auto-merge (squash) on PRs after creating them: `gh pr merge <number> --repo microsoft/vscode-python-debugger --squash --auto`
- PRs require approval from someone other than the last pusher before merging.
