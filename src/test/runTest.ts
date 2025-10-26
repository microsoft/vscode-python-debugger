import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';
import { PVSC_ENVS_EXTENSION_ID_FOR_TESTS, PVSC_EXTENSION_ID_FOR_TESTS } from './constants';

/**
 * get Codium exicutable path
 * logic
 * 1. use fixed path '/usr/bin/codium'
 * 2. find with $which codium
 * 3. fallback to downloadAndUnzipVSCode()
 */
async function getVSCodeExecutablePath(): Promise<{ executablePath: string; isDownloaded: boolean }> {

    const fixedPath = '/usr/bin/codium';
    if (fs.existsSync(fixedPath)) {
        console.log(`Using fixed Codium path: ${fixedPath}`);
        return { executablePath: fixedPath, isDownloaded: false };
    }

    try {
        const whichResult = cp.spawnSync('which', ['codium'], { encoding: 'utf8' });
        if (whichResult.status === 0 && whichResult.stdout.trim()) {
            const whichPath = whichResult.stdout.trim();
            console.log(`Found Codium using which: ${whichPath}`);
            return { executablePath: whichPath, isDownloaded: false };
        }
    } catch (error) {
        console.log('which command failed, trying fallback methods...');
    }

    console.log('Codium not found locally, downloading VSCode as fallback...');
    try {
        const downloadedPath = await downloadAndUnzipVSCode('stable');
        console.log(`Downloaded VSCode to: ${downloadedPath}`);
        return { executablePath: downloadedPath, isDownloaded: true };
    } catch (downloadError) {
        console.error('Failed to download VSCode:', downloadError);
        throw new Error('Could not find local Codium and failed to download VSCode as fallback');
    }
}

function getCliPath(executablePath: string, isDownloaded: boolean): [string, ...string[]] {
    // use original resolver if Code is downloaded
    if (isDownloaded) {
        try {
            const [cliPath, ...args] = resolveCliArgsFromVSCodeExecutablePath(executablePath);
            return [cliPath, ...args];
        } catch (error) {
            console.warn('Failed to resolve CLI path for downloaded VSCode, using executable path');
            return [executablePath];
        }
    }
    
    // return path only if using local Codium
    return [executablePath];
}

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../');

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './unittest/index');

        const { executablePath: vscodeExecutablePath, isDownloaded } = await getVSCodeExecutablePath();
        const [cliPath, ...args] = getCliPath(vscodeExecutablePath, isDownloaded);

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
                cliPath,
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
