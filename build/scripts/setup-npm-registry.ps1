[CmdletBinding()]
<#
.SYNOPSIS
  Rewrites lockfiles to use a custom npm registry.

.DESCRIPTION
  Some lockfiles can contain hardcoded references to public npm registries.
  This wrapper sets NPM_CONFIG_REGISTRY and runs the Node helper script
  (setup-npm-registry.js) that performs in-repo lockfile rewrites.

.PARAMETER Registry
  Custom registry URL.

.EXAMPLE
  ./setup-npm-registry.ps1 -Registry "$(AZURE_ARTIFACTS_FEED)"
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Registry
)

$Registry = $Registry.Trim()
if (-not $Registry.EndsWith('/')) {
  $Registry = "$Registry/"
}

$env:NPM_CONFIG_REGISTRY = $Registry

$scriptPath = Join-Path $PSScriptRoot 'setup-npm-registry.js'
if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
  throw "Expected JS helper script at: $scriptPath"
}

node $scriptPath
