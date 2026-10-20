[CmdletBinding()]
param(
    [string]$Registry = '192.168.3.11:32769',
    [string]$ImageName = 'menuplanning',
    [string]$Tag = 'latest'
)

$ErrorActionPreference = 'Stop'
$image = "${Registry}/${ImageName}:${Tag}"
$projectRoot = Split-Path -Parent $PSScriptRoot

Push-Location $projectRoot
try {
    & npm test
    if ($LASTEXITCODE -ne 0) { throw 'Tests mislukt; publicatie gestopt.' }

    & docker build --pull --tag $image .
    if ($LASTEXITCODE -ne 0) { throw 'Docker-build mislukt; publicatie gestopt.' }

    & docker push $image
    if ($LASTEXITCODE -ne 0) { throw 'Docker-publicatie mislukt. Controleer registrybereikbaarheid, TLS en eventuele docker login.' }

    Write-Host "Gepubliceerd: $image"
    Write-Host "Stel in Portainer APP_IMAGE=$image in."
}
finally {
    Pop-Location
}
