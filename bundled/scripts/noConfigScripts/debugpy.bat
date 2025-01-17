@echo off
:: Bat script
python %BUNDLED_DEBUGPY_PATH% --listen 0 --wait-for-client %*
