# Python Debugger extension for Visual Studio Code

A [Visual Studio Code](https://code.visualstudio.com/) [extension](https://marketplace.visualstudio.com/VSCode) that supports Python debugging with debugpy. Python Debugger provides a seamless debugging experience by allowing you to set breakpoints, step through code, inspect variables, and perform other essential debugging tasks. The debugpy extension offers debugging support for various types of Python applications including scripts, web applications, remote processes, and multi-threaded processes. 

Note: 
- The Python extension offers the python debugger extension as an optional installation, including it during the setup process.
- This extension is supported for all [actively supported versions](https://devguide.python.org/#status-of-python-branches) of the Python language. See below for support on deprecated Python versions.


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

## Limited support for deprecated Python versions

Older versions of the Python Debugger extension are available for debugging Python projects that use outdated Python versions like Python 2.7 and Python 3.6. However, it’s important to note that our team is no longer maintaining these extension versions. We strongly advise you to update your project to a supported Python version if possible.

You can reference the table below to find the most recent Python Debugger extension version that offers debugging support for projects using deprecated Python versions, as well as the debugpy version that is shipped in each extension version. 

> **Note**: If you do not see older extension versions to install (<=`2024.0.0`), try opting-in to pre-releases. You can do so on the extension page by clicking `Switch to Pre-Release Version`. 

| Python version | Latest supported Python Debugger extension version |  debugpy version |
| -------------- | -------------------------------------------------- | ---------------- |
| 2.7, >= 3.5    | 2023.1.XXX                                         | 1.5.1            |
| >= 3.7         | 2024.0.XXX                                         | 1.7.0            |
| >= 3.8         | 2024.2.XXX                                         | 1.8.1            |
| >= 3.9         | 2025.5.XXX                                         | 1.8.13           |


> **Note**: Once you install an older version of the Python Debugger extension in VS Code, you may want to disable auto update by changing the value of the `"extensions.autoUpdate"` setting in your `settings.json` file.


## Data and telemetry
The Debugpy Extension for Visual Studio Code collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](https://privacy.microsoft.com/privacystatement) to learn more. This extension respects the `telemetry.telemetryLevel` setting which you can learn more about at https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting.

### Local package feeds

Use Node.js supported by this repository and Python 3.10 or later. Both setup commands create or reuse `.venv` and install the Python bundling tools. Choose the appropriate setup below before installing dependencies. Committed lockfiles use public npm URLs; Microsoft setup rewrites working copies for proxy installs.

#### Public contributors (non-Microsoft employees)

Use the public setup, which selects `https://registry.npmjs.org/` and `https://pypi.org/simple/` for its child processes. No Microsoft account or internal-feed credentials are needed, and this command works before `node_modules` exists:

From the repository root:

```bash
npm run setup
```

For subsequent npm installs, use `npm ci`. Public contributors do not need the Microsoft feed commands or lockfile hook.

#### Microsoft employees only

> **Microsoft users only:** The commands in this section configure Microsoft package feeds. Public contributors should use the public setup above.

Use the Microsoft setup, which selects `https://packagefeedproxy.microsoft.io/npm/` and `https://packagefeedproxy.microsoft.io/pypi/simple/` for its child processes:

```bash
npm run setup:msft
```

Microsoft setup rewrites public npm and Yarn `resolved` URLs in the root `package-lock.json` to the npm proxy before running `npm ci`. Versions, integrity hashes, formatting, and private-feed URLs are preserved. The public setup leaves lockfiles unchanged.

After pulling a new lockfile from GitHub, rerun `npm run setup:msft`, or run the dependency-free rewrite step alone before your next install/build:

```bash
npm run setup:msft-registry
```

The standalone step requires the root lockfile to exist; it does not require a shared TypeScript checkout. Rewriting is idempotent and stops on missing or invalid lockfiles. Keep committed lockfile URLs public using the optional pre-commit hook below (or `npm run normalize-lockfile` for the root lockfile).

For subsequent root npm installs, use:

```bash
npm run ci:msft
```

This rewrites the root lockfile, then runs root `npm ci` with the proxy registry explicitly selected for package, audit, and metadata requests. Use `npm run setup:msft` for full setup, including Python dependencies.

Local setup, lockfile rewriting, and `ci:msft` share the feed URLs in `build/package-feeds.json`.

Both setup commands use the same implementation, stop on errors, and keep registry overrides scoped to setup's child processes; they do not change your shell environment, edit `.npmrc`, or add credentials. The standalone rewrite step only edits lockfiles; it does not configure the registry for subsequent commands.

After setup, run `npm run compile` to build the extension. For subsequent Python commands, use `.venv\Scripts\python.exe` on Windows or `.venv/bin/python` on macOS/Linux (or activate that virtual environment). Registry overrides are not retained after setup.

#### Microsoft contributor pre-commit hook

If you use the Microsoft feeds and will commit changes, enable the recommended lockfile hook once per clone (no installed npm dependencies are required). It is not needed just to install or build:

```bash
npm run setup-hooks
```

The installer sets the clone's local `core.hooksPath` to `.githooks`, which also affects its linked worktrees. It refuses to replace an existing hook or a different hooks configuration. If you already use hooks, add `node build/normalize-package-lock.js --staged` to your existing pre-commit hook instead. Only enable this configuration in worktrees/branches that contain these hook files.

Before a local commit, the hook converts known `Pylance_PublicPackages`, `packagefeedproxy.microsoft.io/npm/`, and named `1es-public/npm-public` mirror tarball URLs in the staged root `package-lock.json` to public npm URLs. It preserves versions, integrity hashes, formatting, and intentional Azure-hosted dependencies such as `msft_consumption`. Unknown feeds are left unchanged. It re-stages only the lockfile; if normalization is needed and the lockfile has unstaged changes, the commit is blocked without modifying it. Stage or stash those changes, then retry.

To normalize manually, run `npm run normalize-lockfile`, review the changes, and stage them. To disable the installed hook, run `git config --local --unset core.hooksPath`. These are local Git hooks: GitHub and Dependabot do not execute them. No workflow writes changes to PR branches.

### GitHub Actions package feeds

The PR, push, and CodeQL workflows set `NPM_CONFIG_REGISTRY` to `https://packagefeedproxy.microsoft.io/npm/` and `PIP_INDEX_URL` to `https://packagefeedproxy.microsoft.io/pypi/simple/`. These workflow-level settings also apply to the shared build/lint actions, nested npm commands, and pip installs in nox sessions. The npm endpoint follows the [TypeScript CI package-feed-proxy job](https://github.com/microsoft/TypeScript/blob/main/.github/workflows/ci.yml).

The shared lint and VSIX build actions and applicable PR/push test jobs use `npm run ci:msft`, rewriting working-copy lockfile URLs before installation and explicitly selecting the proxy for npm requests. Workflows do not commit these rewrites or change local registry configuration or Dependabot configuration. Existing dependency caches are retained; the VSIX build also retains its offline-cache preference. CodeQL retains workflow-level feed settings for its autobuild step.

### Azure release package feeds

The DevDiv Azure stable/prerelease pipelines pass the npm proxy to their build/publish templates using `customNPMRegistry`. Their dependency install steps use `npm run ci:msft` to rewrite the root npm lockfile and install through the proxy.

Each Python bootstrap and bundled-library install step explicitly sets `PIP_INDEX_URL` from `PIP_PROXY_INDEX_URL`, selecting the pip proxy even when a template's authentication setup changes the job-level index. Release triggers, approval gates, signing, and publishing behavior are unchanged.

Dependabot continues to use public registries and its existing update settings. Legacy Azure stable, prerelease, and validation definitions are unchanged.
