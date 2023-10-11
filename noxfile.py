# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
"""All the action we need during build"""
import hashlib
import io
import json
import os
import pathlib
import re
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
        "--upgrade",
        "-r",
        "./requirements.txt",
    )
    session.install("packaging")

    debugpy_info_json_path = pathlib.Path(__file__).parent / "debugpy_info.json"
    debugpy_info = json.loads(debugpy_info_json_path.read_text(encoding="utf-8"))

    target = os.environ.get("VSCETARGET", "")
    print("target:", target)
    if "darwin" in target:
        download_url(debugpy_info["macOS"])
    elif "win32-ia32" == target:
        download_url(debugpy_info["win32"])
    elif "win32-x64" == target:
        download_url(debugpy_info["win64"])
    elif "linux-x64" == target:
        download_url(debugpy_info["linux"])
    else:
        download_url(debugpy_info["any"])


def download_url(value):
    with url_lib.urlopen(value["url"]) as response:
        data = response.read()
        hash_algorithm, hash_digest = value["hash"]
        if hashlib.new(hash_algorithm, data).hexdigest() != hash_digest:
            raise ValueError("Failed hash verification for {}.".format(value["url"]))
        print("Download: ", value["url"])
        with zipfile.ZipFile(io.BytesIO(data), "r") as wheel:
            libs_dir = pathlib.Path.cwd() / "bundled" / "libs"
            for zip_info in wheel.infolist():
                print("\t" + zip_info.filename)
                wheel.extract(zip_info.filename, libs_dir)


@nox.session()
def update_build_number(session: nox.Session) -> None:
    """Updates build number for the extension."""
    if len(session.posargs) == 0:
        session.log("No updates to package version")
        return

    package_json_path = pathlib.Path(__file__).parent / "package.json"
    session.log(f"Reading package.json at: {package_json_path}")

    package_json = json.loads(package_json_path.read_text(encoding="utf-8"))

    parts = re.split("\\.|-", package_json["version"])
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

    try:
        return list(
            {"url": r["url"], "hash": ("sha256", r["digests"]["sha256"])}
            for r in data["releases"][use_version]
            if _contains(r["url"], ("{}-{}".format(cp, platform),))
        )[0]

    except:
        return list(
            {"url": r["url"], "hash": ("sha256", r["digests"]["sha256"])}
            for r in data["releases"][use_version]
            if _contains(r["url"], ("{}-{}".format("py3", platform),))
        )[0]


@nox.session()
def create_debugpy_json(session: nox.Session, version="1.7.0", cp="cp311"):
    platforms = [
        ("macOS", "macosx"),
        ("win32", "win32"),
        ("win64", "win_amd64"),
        ("linux", "manylinux"),
        ("any", "none-any"),
    ]
    debugpy_info_json_path = pathlib.Path(__file__).parent / "debugpy_info.json"
    debugpy_info = {p: _get_debugpy_info(version, id, cp) for p, id in platforms}
    debugpy_info_json_path.write_text(
        json.dumps(debugpy_info, indent=4), encoding="utf-8"
    )


def _contains(s, parts=()):
    return any(p for p in parts if p in s)
