[CmdletBinding()]
<#
.SYNOPSIS
  Ensures the npm user config contains "always-auth=true".

.DESCRIPTION
  npmAuthenticate@0 may overwrite the working .npmrc. This script is intended to run
  after npmAuthenticate@0 to append "always-auth=true" if it is not already present.

.PARAMETER Path
  Path to the npm user config file to update.

.EXAMPLE
  ./finalize-npm-config.ps1 -Path "$(Agent.TempDirectory)/.npmrc"
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Path
)

$existing = if (Test-Path -LiteralPath $Path) {
  Get-Content -LiteralPath $Path -ErrorAction Stop
} else {
  @()
}

if ($existing -notcontains 'always-auth=true') {
  'always-auth=true' | Out-File -FilePath $Path -Append -Encoding utf8
  Write-Host "Appended always-auth=true -> $Path"
} else {
  Write-Host "always-auth=true already present in $Path"
}
