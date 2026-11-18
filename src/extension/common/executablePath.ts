// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import * as path from 'path';

/**
 * On Windows, the legacy Python extension API can return an interpreter path without the
 * `.exe` suffix (e.g. `.venv\Scripts\python`), which does not exist on disk. If the given path
 * has no extension, does not exist, and `<path>.exe` does exist, return the `.exe` path.
 * Otherwise return the path unchanged.
 */
export function restoreWindowsExeSuffix(
    executable: string,
    platform: NodeJS.Platform = process.platform,
    exists: (p: string) => boolean = fs.existsSync,
): string {
    if (platform !== 'win32' || path.extname(executable) !== '' || exists(executable)) {
        return executable;
    }
    const withExe = `${executable}.exe`;
    return exists(withExe) ? withExe : executable;
}
