# this doc has not written yet...

1. prerequisites

code or codium

python and pip

node and npm

fork this repo

2. npm install

3. create venv

4. pip install nox

5. nox -session install_bundled_libs

6. npm run test

7. other tests(lint, compile-test, ...)

8. packaging

9. install vsix pack

---

name: 'Build VSIX'
description: "Build the extension's VSIX"

steps:

    - name: Install Node

    # Minimum supported version is Python 3.9
    - name: Use Python 3.9

    # For faster/better builds of sdists.
    - name: Update pip, install pipx and install wheel
      run: python -m pip install -U pip pipx wheel
      shell: bash

    - name: Run npm ci
      run: npm ci --prefer-offline
      shell: bash

    - name: Install bundled python libraries
      run: pipx run nox --session install_bundled_libs
      shell: bash

name: 'Lint'
description: 'Lint TypeScript and Python code'

    - name: Lint TypeScript code
      run: npm run lint
      shell: bash

    - name: Check TypeScript format
      run: npm run format-check
      shell: bash

    - name: Check linting and formatting
      run: pipx run nox --session lint
      shell: bash

test

    - name: Update extension build number
      run: pipx run nox --session update_build_number -- $GITHUB_RUN_ID
      shell: bash

    - name: Build VSIX
      run: npm run vsce-package
      shell: bash

