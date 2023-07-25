
import os

from ..bundled.libs.debugpy._version import get_versions

EXTENSION_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEBUGGER_DEST = os.path.join(EXTENSION_ROOT, "bundled", "debugpy", "_version.py")


def main():
    data = get_versions()
    return data

if __name__ == "__main__":
    main()