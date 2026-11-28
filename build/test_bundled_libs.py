# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import Mock, patch

import noxfile


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

            def download(*args):
                dest = Path(args[args.index("--dest") + 1])
                with zipfile.ZipFile(dest / "debugpy-test.whl", "w") as wheel:
                    wheel.writestr("debugpy/new.py", b"new")

            session = Mock()
            session.run.side_effect = download
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
