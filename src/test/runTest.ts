import * as cp from 'child_process';
import * as path from 'path';

import { /*downloadAndUnzipVSCode,*/ resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';
import { PVSC_ENVS_EXTENSION_ID_FOR_TESTS, PVSC_EXTENSION_ID_FOR_TESTS } from './constants';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../');

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './unittest/index');
        // No need to download a new codium
        const vscodeExecutablePath = /*await downloadAndUnzipVSCode('stable')*/'/usr/bin/codium'; // TODO: get this path by using $which codium
        const [cliPath, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
        const codiumCliPath = '/usr/bin/codium'; // TODO: get this path by using $which codium

        // Use cp.spawn / cp.exec for custom setup
        const isWin = process.platform === 'win32';
        if (isWin) {
            try {
                const installResult = cp.spawnSync(
                    cliPath,
                    [...args, '--install-extension', PVSC_EXTENSION_ID_FOR_TESTS, PVSC_ENVS_EXTENSION_ID_FOR_TESTS],
                    {
                        cwd: path.dirname(cliPath),
                        encoding: 'utf8',
                        stdio: 'inherit',
                        shell: true,
                    },
                );
                if (installResult.error) {
                    console.error('Extension installation error:', installResult.error);
                }
                if (installResult.status !== 0) {
                    console.error(`Extension installation failed with exit code: ${installResult.status}`);
                } else {
                    console.log('Extension installation succeeded.');
                }
            } catch (ex) {
                console.error('Exception during extension installation:', ex);
            }
        } else {
            const installResult = cp.spawnSync(
                codiumCliPath,
                [...args, '--install-extension', PVSC_EXTENSION_ID_FOR_TESTS, PVSC_ENVS_EXTENSION_ID_FOR_TESTS],
                {
                    encoding: 'utf8',
                    stdio: 'inherit',
                },
            );
            if (installResult.error) {
                console.error('Extension installation error:', installResult.error);
            }
            if (installResult.status !== 0) {
                console.error(`Extension installation failed with exit code: ${installResult.status}`);
            } else {
                console.log('Extension installation succeeded.');
            }
        }
        console.log('Extensions installed, ready to run tests.');

        // Run the extension test
        await runTests({
            // Use the specified `code` executable
            vscodeExecutablePath,
            extensionDevelopmentPath,
            extensionTestsPath,
        });
    } catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main();
