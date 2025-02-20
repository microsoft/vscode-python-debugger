@echo off
:: Bat script
set DEBUGPY_ADAPTER_ENDPOINTS=%VSCODE_DEBUGPY_ADAPTER_ENDPOINTS%
python %BUNDLED_DEBUGPY_PATH% --listen 0 --wait-for-client %*
