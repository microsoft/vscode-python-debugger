[CmdletBinding()]
<#
.SYNOPSIS
  Creates a temporary npm user config (.npmrc) file for Azure Pipelines.

.DESCRIPTION
  Ensures the path exists and points to a file (not a directory), then sets pipeline
  variables so subsequent steps can use a job-scoped npm config instead of relying
  on a checked-in repository .npmrc.

  Variables set:
    - NPM_CONFIG_USERCONFIG: points npm/npx to the temp .npmrc
    - NPM_CONFIG_REGISTRY:   (optional) registry URL to use for installs

.PARAMETER Path
  Full path to the .npmrc file to create/use (e.g. $(Agent.TempDirectory)/.npmrc).

.PARAMETER Registry
  Optional custom npm registry URL. If provided, sets NPM_CONFIG_REGISTRY.

.EXAMPLE
  ./ensure-npm-userconfig.ps1 -Path "$(Agent.TempDirectory)/.npmrc" -Registry "$(AZURE_ARTIFACTS_FEED)"
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Path,

  [Parameter(Mandatory = $false)]
  [string]$Registry = ''
)

if (Test-Path -LiteralPath $Path -PathType Container) {
  throw "npmrcPath points to a directory (expected a file): $Path"
}

$parent = Split-Path -Parent $Path
if ($parent -and -not (Test-Path -LiteralPath $parent)) {
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
  New-Item -ItemType File -Path $Path -Force | Out-Null
}

Write-Host "##vso[task.setvariable variable=NPM_CONFIG_USERCONFIG]$Path"

if (-not [string]::IsNullOrWhiteSpace($Registry)) {
  Write-Host "##vso[task.setvariable variable=NPM_CONFIG_REGISTRY]$Registry"
}
