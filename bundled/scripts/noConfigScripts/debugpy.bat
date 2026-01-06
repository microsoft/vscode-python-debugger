@echo off
:: Bat script
set "DEBUGPY_ADAPTER_ENDPOINTS=%VSCODE_DEBUGPY_ADAPTER_ENDPOINTS%\endpoint-%RANDOM%%RANDOM%.txt"
python %BUNDLED_DEBUGPY_PATH% --listen 0 --wait-for-client %*
