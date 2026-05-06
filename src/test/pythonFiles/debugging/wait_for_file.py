"""
Wait for a file to appear, then print 'done!' and exit.

This script is used to keep a debug session alive (by pausing the script
until the test harness is ready to terminate it), and to produce a known
output (useful for verifying that output was captured correctly).

Usage:
    python wait_for_file.py <done_file> [output_file]
"""
import os
import sys
import time


def wait_for_file(path: str) -> None:
    while not os.path.exists(path):
        time.sleep(0.1)


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print("usage: wait_for_file.py <done_file> [output_file]", file=sys.stderr)
        sys.exit(1)

    done_file = args[0]
    output_file = args[1] if len(args) > 1 else None

    wait_for_file(done_file)

    if output_file:
        with open(output_file, "w") as f:
            f.write("done!\n")
    else:
        print("done!")


if __name__ == "__main__":
    main()
