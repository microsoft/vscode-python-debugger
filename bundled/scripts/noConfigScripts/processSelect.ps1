# PowerShell script
$env:DEBUGPY_ADAPTER_ENDPOINTS = $env:VSCODE_DEBUGPY_ADAPTER_ENDPOINTS
$os = [System.Environment]::OSVersion.Platform
Get-WmiObject Win32_Process | Select-Object Name,CommandLine,ProcessId | Format-List