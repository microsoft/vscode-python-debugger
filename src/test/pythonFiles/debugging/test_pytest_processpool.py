import os
import random
import time
from concurrent.futures import ProcessPoolExecutor, wait as futures_wait


def worker_func() -> int:
    time_to_sleep = random.uniform(0.1, 0.2)
    time.sleep(time_to_sleep)
    return int(time_to_sleep * 10)


def library_function() -> None:
    futures = []
    with ProcessPoolExecutor(max_workers=4) as pool:
        for _ in range(8):
            futures.append(pool.submit(worker_func))
        completed_futures, _ = futures_wait(futures)
        for fut in completed_futures:
            _ = fut.result()


def test_library_process_pool() -> None:
    library_function()
    done_file = os.environ.get("DEBUG_DONE_FILE")
    if done_file:
        with open(done_file, "w", encoding="utf-8") as fp:
            fp.write("done")
