# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
"""All the action we need during build"""

import hashlib
import io
import json
import os
import pathlib
import re
import tempfile
import urllib.request as url_lib
import zipfile

import nox  # pylint: disable=import-error


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

    debugpy_info_json_path = pathlib.Path(__file__).parent / "debugpy_info.json"
    debugpy_info = json.loads(debugpy_info_json_path.read_text(encoding="utf-8"))

    target = os.environ.get("VSCETARGET", "")
    print("target:", target)
    if "darwin" in target:
        wheels = debugpy_info["macOS"]
    elif "win32-ia32" == target:
        wheels = debugpy_info.get("win32", debugpy_info["any"])
    elif "win32-x64" == target:
        wheels = debugpy_info["win64"]
    elif "linux-x64" == target:
        wheels = debugpy_info["linux"]
    else:
        wheels = debugpy_info["any"]

    download_debugpy_via_pip(session, wheels)


def _parse_wheel_info(url: str) -> dict:
    """Parse version and platform info from a wheel URL.

    Example URL: .../debugpy-1.8.19-cp311-cp311-win_amd64.whl
    Returns: {"version": "1.8.19", "py_ver": "311", "abi": "cp311", "platform": "win_amd64"}
    """
    filename = url.rsplit("/", 1)[-1]
    # Wheel filename format: {name}-{version}-{python}-{abi}-{platform}.whl
    match = re.match(r"debugpy-([^-]+)-cp(\d+)-([^-]+)-(.+)\.whl", filename)
    if match:
        return {
            "version": match.group(1),
            "py_ver": match.group(2),
            "abi": match.group(3),
            "platform": match.group(4),
        }
    # Fallback for py2.py3-none-any wheels
    match = re.match(r"debugpy-([^-]+)-py\d\.py\d-none-any\.whl", filename)
    if match:
        return {
            "version": match.group(1),
            "py_ver": None,
            "abi": "none",
            "platform": "any",
        }
    raise ValueError(f"Could not parse wheel filename: {filename}")


def download_debugpy_via_pip(session: nox.Session, wheels: list) -> None:
    """Downloads debugpy wheels via pip and extracts them into bundled/libs.

    Uses pip to download by package name, allowing pip to use configured
    index URLs (e.g., Azure Artifacts feed) instead of direct PyPI URLs.
    """
    libs_dir = pathlib.Path.cwd() / "bundled" / "libs"
    libs_dir.mkdir(parents=True, exist_ok=True)

    # Parse version and platform info from wheel URLs
    parsed = [_parse_wheel_info(w["url"]) for w in wheels]
    version = parsed[0]["version"]

    with tempfile.TemporaryDirectory(prefix="debugpy_wheels_") as tmp_dir:
        tmp_path = pathlib.Path(tmp_dir)

        for info in parsed:
            args = [
                "python",
                "-m",
                "pip",
                "download",
                f"debugpy=={version}",
                "--no-deps",
                "--only-binary",
                ":all:",
                "--dest",
                str(tmp_path),
            ]
            if info["py_ver"]:
                # Platform-specific wheel
                args.extend(["--python-version", info["py_ver"]])
                args.extend(["--implementation", "cp"])
                args.extend(["--abi", info["abi"]])
                args.extend(["--platform", info["platform"]])
            # For none-any wheels, no platform args needed

            session.run(*args)

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


def download_url(values):
    for value in values:
        with url_lib.urlopen(value["url"]) as response:
            data = response.read()
            digest = value["hash"]["sha256"]
            if hashlib.new("sha256", data).hexdigest() != digest:
                raise ValueError(f"Failed hash verification for {value['url']}.")

            print("Download: ", value["url"])
            with zipfile.ZipFile(io.BytesIO(data), "r") as wheel:
                libs_dir = pathlib.Path.cwd() / "bundled" / "libs"
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


def _get_pypi_package_data(package_name):
    json_uri = "https://pypi.org/pypi/{0}/json".format(package_name)
    # Response format: https://warehouse.readthedocs.io/api-reference/json/#project
    # Release metadata format: https://github.com/pypa/interoperability-peps/blob/master/pep-0426-core-metadata.rst
    with url_lib.urlopen(json_uri) as response:
        return json.loads(response.read())


def _get_debugpy_info(version="latest", platform="none-any", cp="cp311"):
    from packaging.version import parse as version_parser

    data = _get_pypi_package_data("debugpy")

    if version == "latest":
        use_version = max(data["releases"].keys(), key=version_parser)
    else:
        use_version = version

    return list(
        {"url": r["url"], "hash": {"sha256": r["digests"]["sha256"]}}
        for r in data["releases"][use_version]
        if f"{cp}-{platform}" in r["url"] or f"py3-{platform}" in r["url"]
    )[0]


@nox.session
def create_debugpy_json(session: nox.Session):
    platforms = [
        ("macOS", "macosx"),
        # ("win32", "win32"), # VS Code does not support 32-bit Windows anymore
        ("win64", "win_amd64"),
        ("linux", "manylinux"),
        ("any", "none-any"),
    ]
    debugpy_info_json_path = pathlib.Path(__file__).parent / "debugpy_info.json"
    debugpy_info = {}
    for p, id in platforms:
        # we typically have the latest 3 versions of debugpy compiled bits
        downloads = []
        for cp in ["cp310", "cp311", "cp312"]:
            data = _get_debugpy_info("latest", id, cp)
            if not any(d["url"] == data["url"] for d in downloads):
                downloads.append(data)
        debugpy_info[p] = downloads
    debugpy_info_json_path.write_text(
        json.dumps(debugpy_info, indent=4), encoding="utf-8"
    )
