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
