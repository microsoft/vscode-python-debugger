[CmdletBinding()]
<#
.SYNOPSIS
  Configures npm (and yarn, if present) to use a custom registry for the current job.

.DESCRIPTION
  Intended for Azure Pipelines jobs that authenticate using npmAuthenticate@0 against a
  temp user config (.npmrc). This script sets per-process environment variables so npm
  reads from the provided user config and targets the provided registry.

  Notes:
    - Normalizes the registry to ensure it ends with '/'.
    - Writes npm's registry setting into the user config file via `npm config set`.
    - If yarn is installed on the agent, updates yarn's registry as well.

.PARAMETER NpmrcPath
  Path to the npm user config file (the file used by npmAuthenticate@0).

.PARAMETER Registry
  Custom registry URL.

.EXAMPLE
  ./setup-npm-and-yarn.ps1 -NpmrcPath "$(Agent.TempDirectory)/.npmrc" -Registry "$(AZURE_ARTIFACTS_FEED)"
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$NpmrcPath,

  [Parameter(Mandatory = $true)]
  [string]$Registry
)

$Registry = $Registry.Trim()
if (-not $Registry.EndsWith('/')) {
  $Registry = "$Registry/"
}

$env:NPM_CONFIG_USERCONFIG = $NpmrcPath
$env:NPM_CONFIG_REGISTRY = $Registry

# Configure npm to use the custom registry (writes to the user config file).
npm config set registry "$Registry"

# Configure yarn if available.
$yarn = Get-Command yarn -ErrorAction SilentlyContinue
if ($null -ne $yarn) {
  yarn config set registry "$Registry"
} else {
  Write-Host "yarn not found; skipping yarn registry configuration"
}
