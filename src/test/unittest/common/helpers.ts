import { Uri } from 'vscode';
import { PythonEnvironment } from '../../../extension/envExtApi';

/**
 * Helper to build a simple PythonEnvironment object for tests.
 * @param execPath string - path to the python executable
 * @param version string - python version string (e.g. '3.9.0')
 * @param sysPrefix string - sysPrefix value (optional)
 */
export function buildPythonEnvironment(execPath: string, version: string, sysPrefix: string = ''): PythonEnvironment {
    const execUri = Uri.file(execPath);
    return {
        envId: {
            id: execUri.fsPath,
            managerId: 'Venv',
        },
        name: `Python ${version}`,
        displayName: `Python ${version}`,
        displayPath: execUri.fsPath,
        version: version,
        environmentPath: execUri,
        execInfo: {
            run: {
                executable: execUri.fsPath,
                args: [],
            },
        },
        sysPrefix,
    } as PythonEnvironment;
}

/**
 * Helper to build a PythonEnvironment where activatedRun differs from run.
 * This simulates environment managers like pixi or conda that set activatedRun
 * to a wrapper command (e.g. 'pixi run python') while run.executable points to
 * the actual Python binary.
 *
 * @param execPath string - path to the actual python executable (run.executable)
 * @param activatedRunExecutable string - path/command for the wrapper (activatedRun.executable)
 * @param version string - python version string (e.g. '3.9.0')
 * @param activatedRunArgs string[] - optional args for activatedRun
 */
export function buildPythonEnvironmentWithActivatedRun(
    execPath: string,
    activatedRunExecutable: string,
    version: string,
    activatedRunArgs: string[] = [],
): PythonEnvironment {
    const execUri = Uri.file(execPath);
    return {
        envId: {
            id: execUri.fsPath,
            managerId: 'Venv',
        },
        name: `Python ${version}`,
        displayName: `Python ${version}`,
        displayPath: execUri.fsPath,
        version: version,
        environmentPath: execUri,
        execInfo: {
            run: {
                executable: execUri.fsPath,
                args: [],
            },
            activatedRun: {
                executable: activatedRunExecutable,
                args: activatedRunArgs,
            },
        },
        sysPrefix: '',
    } as PythonEnvironment;
}
