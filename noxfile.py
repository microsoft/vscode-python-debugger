# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
"""All the action we need during build"""

import json
import os
import pathlib
import re
import tempfile
import zipfile

import nox  # pylint: disable=import-error
from nox.command import CommandFailed

# Keep this list explicit and ordered (oldest -> newest).
# Update it whenever we bump supported Python versions.
SUPPORTED_DEBUGPY_CPYTHONS = [
    "cp310",
    "cp311",
    "cp312",
    "cp313",
    "cp314",
]


# Single source of truth for the debugpy version we bundle.
# Update this when bumping debugpy (and update bundled/libs/debugpy accordingly).
DEBUGPY_VERSION = "1.8.19"


def _build_debugpy_wheel_requests(vsce_target: str, version: str) -> list[dict]:
    # Platform tags are pip --platform values; keep a small fallback list for resiliency.
    # Note: these are used only when we build per-target VSIXs (VSCETARGET is set in CI).
    if "darwin" in vsce_target:
        platforms = [
            "macosx_15_0_universal2",
            "macosx_14_0_universal2",
            "macosx_13_0_universal2",
            "macosx_12_0_universal2",
        ]
        return [
            {
                "version": version,
                "python_version": cp.removeprefix("cp"),
                "implementation": "cp",
                "abi": cp,
                "platforms": platforms,
            }
            for cp in SUPPORTED_DEBUGPY_CPYTHONS
        ]

    if vsce_target == "win32-x64":
        return [
            {
                "version": version,
                "python_version": cp.removeprefix("cp"),
                "implementation": "cp",
                "abi": cp,
                "platforms": ["win_amd64"],
            }
            for cp in SUPPORTED_DEBUGPY_CPYTHONS
        ]

    if vsce_target == "linux-x64":
        platforms = [
            "manylinux_2_34_x86_64",
            "manylinux_2_31_x86_64",
            "manylinux_2_28_x86_64",
            "manylinux_2_27_x86_64",
            "manylinux_2_17_x86_64",
        ]
        return [
            {
                "version": version,
                "python_version": cp.removeprefix("cp"),
                "implementation": "cp",
                "abi": cp,
                "platforms": platforms,
            }
            for cp in SUPPORTED_DEBUGPY_CPYTHONS
        ]

    # Default/fallback: ensure we only download the pure-Python wheel (py2.py3-none-any).
    # This is used for targets that don't have compiled wheels (e.g., linux-arm64) and
    # for workflows that don't set VSCETARGET.
    return [
        {
            "version": version,
            # Intentionally omit pip targeting flags here.
            # Passing --python-version 3 makes pip treat it as Python 3.0, which
            # excludes debugpy (Requires-Python >= 3.8).
            "python_version": None,
            "implementation": None,
            "abi": None,
            "platforms": [],
        }
    ]


@nox.session()
def lint(session: nox.Session) -> None:
    """Runs linter and formatter checks on python files."""

    session.install("flake8")
    session.run("flake8", "noxfile.py")

    # check formatting using black
    session.install("black")
    session.run("black", "--check", "noxfile.py")

    # check import sorting using isort
    session.install("isort")
    session.run("isort", "--check", "noxfile.py")

    # check typescript code
    session.run("npm", "run", "lint", external=True)


@nox.session()
def tests(session: nox.Session) -> None:
    """Runs all the tests for the extension."""
    session.install("-r", "./requirements.txt")
    session.run("npm", "run", "test")


@nox.session()
def install_bundled_libs(session):
    """Installs the libraries that will be bundled with the extension."""
    session.install("wheel")
    session.install(
        "-t",
        "./bundled/libs",
        "--no-cache-dir",
        "--implementation",
        "py",
        "--no-deps",
        "--require-hashes",
        "--only-binary",
        ":all:",
        "-r",
        "./requirements.txt",
    )
    session.install("packaging")

    target = os.environ.get("VSCETARGET", "")
    print("target:", target)

    requests = _build_debugpy_wheel_requests(target, DEBUGPY_VERSION)
    download_debugpy_via_pip(session, requests)


def download_debugpy_via_pip(session: nox.Session, requests: list[dict]) -> None:
    """Downloads debugpy wheels via pip and extracts them into bundled/libs.

    Uses pip to download by package name, allowing pip to use configured
    index URLs (e.g., Azure Artifacts feed) instead of direct PyPI URLs.
    """
    libs_dir = pathlib.Path.cwd() / "bundled" / "libs"
    libs_dir.mkdir(parents=True, exist_ok=True)

    if not requests:
        raise ValueError("No debugpy wheel requests were provided.")
    version = requests[0]["version"]

    with tempfile.TemporaryDirectory(prefix="debugpy_wheels_") as tmp_dir:
        tmp_path = pathlib.Path(tmp_dir)

        for req in requests:
            base_args = [
                "python",
                "-m",
                "pip",
                "download",
                f"debugpy=={req['version']}",
                "--no-deps",
                "--only-binary",
                ":all:",
                "--dest",
                str(tmp_path),
            ]

            python_version = req.get("python_version")
            implementation = req.get("implementation")
            abi = req.get("abi")
            platforms = req.get("platforms") or []

            if (
                python_version is None
                and implementation is None
                and abi is None
                and not platforms
            ):
                session.run(*base_args)
                continue

            last_error = None
            for platform in platforms:
                args = base_args + [
                    "--python-version",
                    python_version,
                    "--implementation",
                    implementation,
                    "--abi",
                    abi,
                    "--platform",
                    platform,
                ]

                try:
                    session.run(*args)
                    last_error = None
                    break
                except CommandFailed as exc:
                    last_error = exc
                    continue

            if last_error is not None:
                raise last_error

        wheel_paths = sorted(tmp_path.glob("debugpy-*.whl"))
        if not wheel_paths:
            raise FileNotFoundError(
                f"pip download produced no debugpy wheels for version {version}."
            )

        for wheel_path in wheel_paths:
            print("Downloaded:", wheel_path.name)
            with zipfile.ZipFile(wheel_path, "r") as wheel:
                for zip_info in wheel.infolist():
                    print("\t" + zip_info.filename)
                    wheel.extract(zip_info.filename, libs_dir)


@nox.session()
def update_build_number(session: nox.Session) -> None:
    """Updates build number for the extension."""
    if not len(session.posargs):
        session.log("No updates to package version")
        return

    package_json_path = pathlib.Path(__file__).parent / "package.json"
    session.log(f"Reading package.json at: {package_json_path}")

    package_json = json.loads(package_json_path.read_text(encoding="utf-8"))

    parts = re.split(r"\.|-", package_json["version"])
    major, minor = parts[:2]

    version = f"{major}.{minor}.{session.posargs[0]}"
    version = version if len(parts) == 3 else f"{version}-{''.join(parts[3:])}"

    session.log(f"Updating version from {package_json['version']} to {version}")
    package_json["version"] = version
    package_json_path.write_text(json.dumps(package_json, indent=4), encoding="utf-8")
