# PowerShell script
# VSCODE_DEBUGPY_ADAPTER_ENDPOINTS is a prefix; append random suffix to create unique file
$endpointPrefix = $env:VSCODE_DEBUGPY_ADAPTER_ENDPOINTS
$randomString = [System.Guid]::NewGuid().ToString('N').Substring(0, 8)
$env:DEBUGPY_ADAPTER_ENDPOINTS = "${endpointPrefix}${randomString}.txt"

$os = [System.Environment]::OSVersion.Platform
if ($os -eq [System.PlatformID]::Win32NT) {
    python $env:BUNDLED_DEBUGPY_PATH --listen 0 --wait-for-client $args
} else {
    python3 $env:BUNDLED_DEBUGPY_PATH --listen 0 --wait-for-client $args
}