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

DEBUGPY_WHEEL_URLS = {
    "any": {
        "url": "https://files.pythonhosted.org/packages/39/2f/c8a8cfac6c7fa3d9e163a6bf46e6d27d027b7a1331028e99a6ef7fd3699d/debugpy-1.7.0-py2.py3-none-any.whl",
        "hash": (
            "sha256",
            "f6de2e6f24f62969e0f0ef682d78c98161c4dca29e9fb05df4d298900500550",
        ),
    },
    "macOS": {
        "url": "https://files.pythonhosted.org/packages/bd/a3/5e37ce13c7dd850b72a52be544a058ed49606ebbbf8b95b2ba3c1db5620a/debugpy-1.7.0-cp311-cp311-macosx_11_0_universal2.whl",
        "hash": (
            "sha256",
            "538765a41198aa88cc089295b39c7322dd598f9ef1d52eaae12145c63bf9430a",
        ),
    },
    "linux": {
        "url": "https://files.pythonhosted.org/packages/b4/fc/087324d46dab8e21e084ce2cf670fa7e524ab5e7691692438e4987bd3ecb/debugpy-1.7.0-cp311-cp311-manylinux_2_17_x86_64.manylinux2014_x86_64.whl",
        "hash": (
            "sha256",
            "c7e8cf91f8f3f9b5fad844dd88427b85d398bda1e2a0cd65d5a21312fcbc0c6f",
        ),
    },
    "win32": {
        "url": "https://files.pythonhosted.org/packages/52/59/3591e9f709b7ee4d3a926a8903a395669cd0e0279204a94b6acccf6ed6ee/debugpy-1.7.0-cp311-cp311-win32.whl",
        "hash": (
            "sha256",
            "18a69f8e142a716310dd0af6d7db08992aed99e2606108732efde101e7c65e2a",
        ),
    },
    "win64": {
        "url": "https://files.pythonhosted.org/packages/51/59/84ebd58d3e9de33a54ca8aa4532e03906e5458092dafe240264c2937a99b/debugpy-1.7.0-cp311-cp311-win_amd64.whl",
        "hash": (
            "sha256",
            "7515a5ba5ee9bfe956685909c5f28734c1cecd4ee813523363acfe3ca824883a",
        ),
    },
}


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

    target = os.environ.get("VSCETARGET", "")
    print("target:", target)
    if "darwin" in target:
        download_url(DEBUGPY_WHEEL_URLS["macOS"])
    elif "win32-ia32" == target:
        download_url(DEBUGPY_WHEEL_URLS["win32"])
    elif "win32-x64" == target:
        download_url(DEBUGPY_WHEEL_URLS["win64"])
    elif "linux-x64" == target:
        download_url(DEBUGPY_WHEEL_URLS["linux"])
    else:
        download_url(DEBUGPY_WHEEL_URLS["any"])


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
