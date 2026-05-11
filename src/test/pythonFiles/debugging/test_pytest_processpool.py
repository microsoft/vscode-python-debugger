import os
import time
from concurrent.futures import ProcessPoolExecutor, wait as futures_wait


def worker_func() -> None:
    time.sleep(0.1)


def library_function() -> None:
    futures = []
    with ProcessPoolExecutor(max_workers=4) as pool:
        for _ in range(8):
            futures.append(pool.submit(worker_func))
        completed_futures, not_done = futures_wait(futures)
        assert not not_done
        for fut in completed_futures:
            fut.result()


def test_library_process_pool() -> None:
    library_function()
    done_file = os.environ.get("DEBUG_DONE_FILE")
    if done_file:
        with open(done_file, "w", encoding="utf-8") as fp:
            fp.write("done")
