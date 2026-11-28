# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import Mock, patch

import noxfile


def download_test_wheel(*args):
    dest = Path(args[args.index("--dest") + 1])
    with zipfile.ZipFile(dest / "debugpy-test.whl", "w") as wheel:
        wheel.writestr("debugpy/new.py", b"new")


class BundleReplacementTests(unittest.TestCase):
    def test_failed_install_restores_previous_bundle_and_allows_retry(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(
            Path, "cwd", return_value=Path(tmp)
        ):
            libs = Path(tmp) / "bundled" / "libs"
            libs.mkdir(parents=True)
            old = libs / "old.py"
            old.write_bytes(b"old")
            requests = noxfile._build_debugpy_wheel_requests(
                "", noxfile.DEBUGPY_VERSION
            )

            session = Mock()
            session.run.side_effect = download_test_wheel
            rename = Path.rename

            def fail_install(source, target):
                if source.name == "libs" and target == libs:
                    raise PermissionError("install blocked")
                return rename(source, target)

            with patch.object(Path, "rename", fail_install):
                with self.assertRaisesRegex(PermissionError, "install blocked"):
                    noxfile.download_debugpy_via_pip(session, requests)

            self.assertEqual(old.read_bytes(), b"old")
            noxfile.download_debugpy_via_pip(session, requests)
            self.assertFalse(old.exists())
            self.assertEqual((libs / "debugpy" / "new.py").read_bytes(), b"new")

    def test_retry_cleans_leftover_backup_when_bundle_is_installed(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(
            Path, "cwd", return_value=Path(tmp)
        ):
            libs = Path(tmp) / "bundled" / "libs"
            libs.mkdir(parents=True)
            (libs / "installed.py").write_bytes(b"installed")
            backup = libs.parent / ".debugpy-build" / "previous"
            backup.mkdir(parents=True)
            (backup / "locked.py").write_bytes(b"left over")

            session = Mock()
            session.run.side_effect = download_test_wheel
            noxfile.download_debugpy_via_pip(
                session,
                noxfile._build_debugpy_wheel_requests("", noxfile.DEBUGPY_VERSION),
            )

            self.assertFalse(backup.exists())
            self.assertEqual((libs / "debugpy" / "new.py").read_bytes(), b"new")

    def test_retry_preserves_only_remaining_bundle(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(
            Path, "cwd", return_value=Path(tmp)
        ):
            backup = Path(tmp) / "bundled" / ".debugpy-build" / "previous"
            backup.mkdir(parents=True)
            old = backup / "old.py"
            old.write_bytes(b"recover me")

            session = Mock()
            with self.assertRaises(FileExistsError):
                noxfile.download_debugpy_via_pip(
                    session,
                    noxfile._build_debugpy_wheel_requests("", noxfile.DEBUGPY_VERSION),
                )

            session.run.assert_not_called()
            self.assertEqual(old.read_bytes(), b"recover me")
