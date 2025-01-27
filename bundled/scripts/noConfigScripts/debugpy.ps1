# PowerShell script
if ($PSVersionTable.OS -match "Windows") {
    python $env:BUNDLED_DEBUGPY_PATH --listen 0 --wait-for-client $args
} else {
    python3 $env:BUNDLED_DEBUGPY_PATH --listen 0 --wait-for-client $args
}
