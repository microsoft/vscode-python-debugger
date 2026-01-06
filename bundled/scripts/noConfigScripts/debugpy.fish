# Fish script
set endpoint_dir $VSCODE_DEBUGPY_ADAPTER_ENDPOINTS
set endpoint_file (mktemp -p $endpoint_dir endpoint-XXXXXX.txt)
set -x DEBUGPY_ADAPTER_ENDPOINTS $endpoint_file
python3 $BUNDLED_DEBUGPY_PATH --listen 0 --wait-for-client $argv
