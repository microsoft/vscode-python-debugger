"""
Pytest test file demonstrating the multiprocessing issue when debugging.

When debugging pytest tests, creating a child process via multiprocessing.Process
and then waiting for it via process.join() can cause premature exit of the debug
session. Specifically, the debugger terminates immediately after the child process
terminates (i.e., at the point where process.join() returns), before reaching
subsequent statements in the test body.

This file contains tests that reproduce the issue described in:
https://github.com/microsoft/vscode-python-debugger/issues/981

Workaround: Use a launch.json with "-s" (--capture=no) in pytest args, or
launch pytest via a custom launch.json with "module": "pytest".
"""
import multiprocessing as mp
import time


def _child_main() -> None:
    """Simple child process that sleeps briefly then exits."""
    time.sleep(0.25)


def test_multiprocessing_join_in_test_body() -> None:
    """
    Regression test: process.join() in a pytest test body should not cause
    premature debugger exit.

    When debugging this test, the debugger should reach print("after!") and
    the assertion, not exit immediately after process.join() returns.
    """
    proc = mp.Process(
        target=_child_main,
        name="debug_multiprocessing_test_body_child",
    )
    proc.daemon = True
    proc.start()
    print("before!")
    proc.join(10)
    print("after!")
    assert proc.exitcode == 0


def test_multiprocessing_nondaemon_join() -> None:
    """
    Variant: non-daemon child process with join().

    Should behave the same as the daemon variant when debugging.
    """
    proc = mp.Process(
        target=_child_main,
        name="debug_multiprocessing_nondaemon_child",
    )
    proc.start()
    proc.join(10)
    assert proc.exitcode == 0
