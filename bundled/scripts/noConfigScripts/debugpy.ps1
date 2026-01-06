# PowerShell script
$endpointFolder = $env:VSCODE_DEBUGPY_ADAPTER_ENDPOINTS
$endpointFile = Join-Path $endpointFolder ("endpoint-{0}.txt" -f ([System.Guid]::NewGuid().ToString('N').Substring(0, 8)))
$env:DEBUGPY_ADAPTER_ENDPOINTS = $endpointFile

$os = [System.Environment]::OSVersion.Platform
if ($os -eq [System.PlatformID]::Win32NT) {
    python $env:BUNDLED_DEBUGPY_PATH --listen 0 --wait-for-client $args
} else {
    python3 $env:BUNDLED_DEBUGPY_PATH --listen 0 --wait-for-client $args
}