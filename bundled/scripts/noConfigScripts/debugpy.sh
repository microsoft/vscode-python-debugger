#! /bin/bash
# Bash script - a copy of `debugpy` for cases where the user has a conflicting `debugpy` in their `PATH`.
export DEBUGPY_ADAPTER_ENDPOINTS=$VSCODE_DEBUGPY_ADAPTER_ENDPOINTS
python3 $BUNDLED_DEBUGPY_PATH --listen 0 --wait-for-client $@
