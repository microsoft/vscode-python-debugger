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

debugpy_urls = {
    "MacOS": {
        "url": "https://files.pythonhosted.org/packages/b1/46/0304622c2c81215298294eba53c038c6d339b783928117687e756ade7def/debugpy-1.8.0-cp310-cp310-macosx_11_0_x86_64.whl",
        "hash": "7fb95ca78f7ac43393cd0e0f2b6deda438ec7c5e47fa5d38553340897d2fbdfb",
    },
    "Windows64": {
        "url": "https://files.pythonhosted.org/packages/61/ad/ba48c35ed40238f05dcf81a10dcafb743ee90f23d2d1a41ba4f030dc0626/debugpy-1.8.0-cp310-cp310-win_amd64.whl",
        "hash": "5d9de202f5d42e62f932507ee8b21e30d49aae7e46d5b1dd5c908db1d7068637",
    },
    "Linux": {
        "url": "https://files.pythonhosted.org/packages/01/18/4be69e4b466f6452ac42b2a2cb7e581a3f1af194f1dd563d5bdabdcd8c21/debugpy-1.8.0-cp310-cp310-manylinux_2_17_x86_64.manylinux2014_x86_64.whl",
        "hash": "ef9ab7df0b9a42ed9c878afd3eaaff471fce3fa73df96022e1f5c9f8f8c87ada",
    },
    "Windows32": {
        "ulr": "https://files.pythonhosted.org/packages/1a/62/325e4b4b512b8b17fa10769bd7e8c64bc3e9957155c1f5eac70df7660e14/debugpy-1.8.0-cp310-cp310-win32.whl",
        "hash": "a8b7a2fd27cd9f3553ac112f356ad4ca93338feadd8910277aff71ab24d8775f",
    },
}


def _install_bundle(session: nox.Session) -> None:
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


def _update_pip_packages(session: nox.Session) -> None:
    session.run("pip-compile", "--generate-hashes", "--upgrade", "./requirements.in")


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


def _get_package_data(package):
    json_uri = f"https://registry.npmjs.org/{package}"
    with url_lib.urlopen(json_uri) as response:
        return json.loads(response.read())


def _update_npm_packages(session: nox.Session) -> None:
    pinned = {
        "vscode-languageclient",
        "@types/vscode",
        "@types/node",
    }
    package_json_path = pathlib.Path(__file__).parent / "package.json"
    package_json = json.loads(package_json_path.read_text(encoding="utf-8"))

    for package in package_json["dependencies"]:
        if package not in pinned:
            data = _get_package_data(package)
            latest = "^" + data["dist-tags"]["latest"]
            package_json["dependencies"][package] = latest

    for package in package_json["devDependencies"]:
        if package not in pinned:
            data = _get_package_data(package)
            latest = "^" + data["dist-tags"]["latest"]
            package_json["devDependencies"][package] = latest

    # Ensure engine matches the package
    if (
        package_json["engines"]["vscode"]
        != package_json["devDependencies"]["@types/vscode"]
    ):
        print(
            "Please check VS Code engine version and @types/vscode version in package.json."
        )

    new_package_json = json.dumps(package_json, indent=4)
    # JSON dumps uses \n for line ending on all platforms by default
    if not new_package_json.endswith("\n"):
        new_package_json += "\n"
    package_json_path.write_text(new_package_json, encoding="utf-8")

    session.run("npm", "audit", "fix", external=True)
    session.run("npm", "install", external=True)


def _setup_template_environment(session: nox.Session) -> None:
    session.install("wheel", "pip-tools")
    _update_pip_packages(session)
    _install_bundle(session)


@nox.session(python="3.7")
def install_bundled_libs(session):
    # Install debugpy by url and platform
    """Installs the libraries that will be bundled with the extension."""
    session.install("wheel")
    _install_bundle(session)

    target = os.environ.get("VSCETARGET")
    print("target:", target)
    if "linux" in target:
        download_url(f"{os.getcwd()}/bundled/libs", debugpy_urls["Linux"])
    elif "win32" in target:
        download_url(f"{os.getcwd()}/bundled/libs", debugpy_urls["Windows64"])
    elif "darwin" in target:
        download_url(f"{os.getcwd()}/bundled/libs", debugpy_urls["MacOS"])
    else:
        _install_package(f"{os.getcwd()}/bundled/libs", "debugpy")


@nox.session(python="3.7")
def setup(session: nox.Session) -> None:
    """Sets up the extension for development."""
    _setup_template_environment(session)


@nox.session()
def update_packages(session: nox.Session) -> None:
    """Update pip and npm packages."""
    session.install("wheel", "pip-tools")
    _update_pip_packages(session)
    _update_npm_packages(session)


def _contains(s, parts=()):
    return any(p for p in parts if p in s)


def _get_pypi_package_data(package_name):
    json_uri = "https://pypi.org/pypi/{0}/json".format(package_name)
    # Response format: https://warehouse.readthedocs.io/api-reference/json/#project
    # Release metadata format: https://github.com/pypa/interoperability-peps/blob/master/pep-0426-core-metadata.rst
    with url_lib.urlopen(json_uri) as response:
        return json.loads(response.read())


def _get_urls(data, version):
    return list(
        r["url"] for r in data["releases"][version] if _contains(r["url"], ("cp310",))
    )


def download_url(root, value):
    with url_lib.urlopen(value["url"]) as response:
        data = response.read()
        if hashlib.sha256(data).hexdigest() == value["hash"]:
            print("Download: ", value["url"])
            with zipfile.ZipFile(io.BytesIO(data), "r") as wheel:
                for zip_info in wheel.infolist():
                    # Ignore dist info since we are merging multiple wheels
                    if ".dist-info/" in zip_info.filename:
                        continue
                    print("\t" + zip_info.filename)
                    wheel.extract(zip_info.filename, root)


def _download_and_extract(root, url):
    if "manylinux" in url or "macosx" in url or "win_amd64" in url:
        root = os.getcwd() if root is None or root == "." else root
        print(url)
        with url_lib.urlopen(url) as response:
            data = response.read()
            with zipfile.ZipFile(io.BytesIO(data), "r") as wheel:
                for zip_info in wheel.infolist():
                    # Ignore dist info since we are merging multiple wheels
                    if ".dist-info/" in zip_info.filename:
                        continue
                    print("\t" + zip_info.filename)
                    wheel.extract(zip_info.filename, root)


def _install_package(root, package_name, version="latest"):
    from packaging.version import parse as version_parser

    data = _get_pypi_package_data(package_name)

    if version == "latest":
        use_version = max(data["releases"].keys(), key=version_parser)
    else:
        use_version = version

    for url in _get_urls(data, use_version):
        _download_and_extract(root, url)


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
