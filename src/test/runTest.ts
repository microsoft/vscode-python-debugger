import * as cp from 'child_process';
import * as path from 'path';

import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';
import { PVSC_EXTENSION_ID_FOR_TESTS } from './constants';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../');

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './unittest/index');

        const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
        console.log("vscodeExecutablePath: ", vscodeExecutablePath);
        const [cliPath, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
        console.log("cliPath: ", cliPath);
        console.log("args: ", args);


        // Use cp.spawn / cp.exec for custom setup
        cp.spawnSync(cliPath, [...args, '--install-extension', PVSC_EXTENSION_ID_FOR_TESTS], {
            encoding: 'utf-8',
            stdio: 'inherit',
        });

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
