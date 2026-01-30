@echo off
:: Bat script
:: VSCODE_DEBUGPY_ADAPTER_ENDPOINTS is a prefix; append random suffix to create unique file
set "DEBUGPY_ADAPTER_ENDPOINTS=%VSCODE_DEBUGPY_ADAPTER_ENDPOINTS%%RANDOM%%RANDOM%.txt"
python %BUNDLED_DEBUGPY_PATH% --listen 0 --wait-for-client %*
