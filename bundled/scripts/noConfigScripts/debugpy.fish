# Fish script
set -x DEBUGPY_ADAPTER_ENDPOINTS $VSCODE_DEBUGPY_ADAPTER_ENDPOINTS
python3 $BUNDLED_DEBUGPY_PATH --listen 0 --wait-for-client $argv
