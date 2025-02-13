# PowerShell script
$os = [System.Environment]::OSVersion.Platform
if ($os -eq [System.PlatformID]::Win32NT) {
    python $env:BUNDLED_DEBUGPY_PATH --listen 0 --wait-for-client $args
} else {
    python3 $env:BUNDLED_DEBUGPY_PATH --listen 0 --wait-for-client $args
}