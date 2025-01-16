## Getting Started

Follow the steps below for setup:
```
git clone https://github.com/microsoft/vscode-python-debugger
cd vscode-python-debugger
npm ci
```

Create virtual environment as appropriate for your shell or use the command `Python: Create Environment` in VS Code. Then activate it appropriate for your shell.
```
python3 -m venv .venv
# Activate the virtual environment
# ".venv/Scripts/activate.bat"
# On bash/zsh it's ...
source .venv/bin/activate
```

Install then setup with nox.
```
python3 -m pip install nox
nox --session setup_repo
```

## Reporting Issues

If you encounter any issues, please report them using the [GitHub Issues](https://github.com/microsoft/vscode-python-debugger/issues) page. Provide as much detail as possible, including steps to reproduce the issue and any relevant logs or screenshots. We also recommend using the Report Issue command in VS Code, selecting Python Debugger as the extension. This helps automatically attach crucial information.

## Submitting Pull Requests

1. Fork the repository and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes.
4. Make sure your code passes linting and formatting requirements
5. Submit a pull request.

## Running Tests

To run tests, use the following commands:

```
npm run compile-tests
npm run test
```

Ensure all tests pass before submitting your pull request.

## Coding Standards

This project follows the coding standards and guidelines from the [vscode-python](https://github.com/microsoft/vscode-python/wiki/Coding#guidelines) repository. Please ensure your code adheres to these standards.

## Code Formatting & Linting

To check code formatting, run:

```
npm run format-check
```

To automatically fix formatting issues, run:

```
npm run format-fix
```

To lint your code, run:

```
npm run lint
```

Ensure there are no linting errors before submitting your pull request.

## Python Code Linting and Formatting

For Python code, this project uses `ruff` for linting and formatting. To check your Python code for linting and formatting issues, run:

```
ruff check .
```

To automatically fix formatting issues, run:

```
ruff --fix .
```

Ensure there are no linting or formatting errors before submitting your pull request.

