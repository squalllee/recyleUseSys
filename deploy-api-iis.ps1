[CmdletBinding()]
param(
  [string]$SiteName = 'Default Web Site',
  [string]$ApplicationPath = '/recycleUseSys/api',
  [string]$PhysicalPath = (Join-Path $PSScriptRoot 'api-server'),
  [string]$AppPoolName = 'RecycleUseSysApiPool',
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$appcmd = Join-Path $env:windir 'System32\inetsrv\appcmd.exe'

function Invoke-AppCmd {
  param([string[]]$Arguments)
  & $appcmd @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "AppCmd failed. ExitCode=$LASTEXITCODE"
  }
}

if (-not (Test-Path -LiteralPath $appcmd)) {
  throw "IIS AppCmd not found: $appcmd"
}
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run this script from an elevated PowerShell window.'
}

$resolvedPhysicalPath = (Resolve-Path -LiteralPath $PhysicalPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $resolvedPhysicalPath 'src\server.js'))) {
  throw "Invalid api-server path: $resolvedPhysicalPath"
}
if (-not (Test-Path -LiteralPath (Join-Path $resolvedPhysicalPath 'web.config'))) {
  throw "api-server\web.config not found: $resolvedPhysicalPath"
}

$existingPool = & $appcmd list apppool $AppPoolName 2>$null
if (-not $existingPool) {
  Write-Host "Creating IIS Application Pool $AppPoolName ..."
  Invoke-AppCmd @('add', 'apppool', "/name:$AppPoolName")
}
Invoke-AppCmd @('set', 'apppool', "/apppool.name:$AppPoolName", '/managedRuntimeVersion:', '/managedPipelineMode:Integrated', '/autoStart:true')

if (-not $SkipInstall) {
  Write-Host 'Installing api-server production dependencies...'
  Push-Location $resolvedPhysicalPath
  try {
    npm ci --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
      throw "npm ci failed. ExitCode=$LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
}

$appIdentity = "$SiteName$ApplicationPath"
$existingApp = & $appcmd list app "/site.name:$SiteName" "/path:$ApplicationPath" 2>$null
$appExists = ($LASTEXITCODE -eq 0 -and $existingApp)
if (-not $appExists) {
  Write-Host "Creating IIS Application $appIdentity ..."
  Invoke-AppCmd @(
    'add', 'app', "/site.name:$SiteName", "/path:$ApplicationPath",
    "/physicalPath:$resolvedPhysicalPath", "/applicationPool:$AppPoolName"
  )
}
else {
  Write-Host "Updating IIS Application $appIdentity ..."
  Invoke-AppCmd @(
    'set', 'vdir', "$appIdentity/",
    "/physicalPath:$resolvedPhysicalPath"
  )
  Invoke-AppCmd @('set', 'app', $appIdentity, "/applicationPool:$AppPoolName")
}

Invoke-AppCmd @('recycle', 'apppool', "/apppool.name:$AppPoolName")

Write-Host ''
Write-Host "Done: $appIdentity"
Write-Host "Health check: http://localhost$ApplicationPath/health"
