// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import { restoreWindowsExeSuffix } from '../../../extension/common/executablePath';

suite('restoreWindowsExeSuffix', () => {
    const noExe = 'C:/proj/.venv/Scripts/python';
    const onlyExe = (p: string) => p === `${noExe}.exe`;

    test('restores .exe on Windows when only the .exe file exists', () => {
        expect(restoreWindowsExeSuffix(noExe, 'win32', onlyExe)).to.equal(`${noExe}.exe`);
    });
    test('keeps path when it exists as given', () => {
        expect(restoreWindowsExeSuffix(noExe, 'win32', () => true)).to.equal(noExe);
    });
    test('keeps path that already has an extension', () => {
        expect(restoreWindowsExeSuffix(`${noExe}.exe`, 'win32', () => false)).to.equal(`${noExe}.exe`);
    });
    test('keeps path when .exe does not exist', () => {
        expect(restoreWindowsExeSuffix(noExe, 'win32', () => false)).to.equal(noExe);
    });
    test('does nothing on non-Windows platforms', () => {
        expect(restoreWindowsExeSuffix('/proj/.venv/bin/python', 'linux', () => true)).to.equal(
            '/proj/.venv/bin/python',
        );
        expect(restoreWindowsExeSuffix(noExe, 'darwin', onlyExe)).to.equal(noExe);
    });
});
