[CmdletBinding()]
param(
    [string]$ServerIp,
    [string]$CandidatePath,
    [string]$KeyPath,
    [switch]$Preview
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$activePath = Join-Path $root 'compose.registry.yaml'
if (-not $CandidatePath) {
    $CandidatePath = Join-Path $root 'compose.registry.yaml.next'
}
if (-not $KeyPath) {
    $KeyPath = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.ssh\LightsailDefaultKey-ap-southeast-2.pem'
}

if (-not (Test-Path -LiteralPath $activePath -PathType Leaf)) {
    throw "Active Compose file is missing: $activePath"
}
if (-not (Test-Path -LiteralPath $CandidatePath -PathType Leaf)) {
    throw "Candidate Compose file is missing: $CandidatePath"
}

$active = [System.IO.File]::ReadAllLines($activePath)
$candidate = [System.IO.File]::ReadAllLines($CandidatePath)
if ($active.Length -ne $candidate.Length) {
    throw 'Candidate must have the same lines as the active Compose file, except for API/web image digests.'
}

$pattern = '^\s*image:\s*(ghcr\.io/a11en-coder/devops-home-inventory-(api|web))@sha256:[0-9a-f]{64}\s*$'
$changedServices = @()
for ($index = 0; $index -lt $active.Length; $index++) {
    if ($active[$index] -ceq $candidate[$index]) { continue }
    $oldImage = [regex]::Match($active[$index], $pattern)
    $newImage = [regex]::Match($candidate[$index], $pattern)
    if (-not $oldImage.Success -or -not $newImage.Success -or
        $oldImage.Groups[1].Value -cne $newImage.Groups[1].Value) {
        throw "Unexpected candidate change at line $($index + 1). Only API/web image digests may change."
    }
    $changedServices += $newImage.Groups[2].Value
    Write-Host ("{0}: {1}" -f $newImage.Groups[2].Value, $candidate[$index].Trim())
}
if (($changedServices | Sort-Object -Unique) -join ',' -cne 'api,web' -or $changedServices.Count -ne 2) {
    throw 'Candidate must change exactly one API digest and one web digest.'
}

Write-Host 'Candidate review passed: database, port, network, and health settings match the active file.'
if ($Preview) {
    Write-Host 'Preview only: no SSH connection, transfer, or deployment was attempted.'
    return
}

if (-not $ServerIp) { throw 'Supply the current Lightsail public IPv4 address with -ServerIp.' }
try {
    $parsedIp = [System.Net.IPAddress]::Parse($ServerIp)
} catch {
    throw 'ServerIp must be a valid IPv4 address.'
}
if ($parsedIp.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
    throw 'ServerIp must be an IPv4 address.'
}
if (-not (Test-Path -LiteralPath $KeyPath -PathType Leaf)) {
    throw "SSH key is missing: $KeyPath"
}
$ssh = (Get-Command ssh.exe -ErrorAction Stop).Source
$scp = (Get-Command scp.exe -ErrorAction Stop).Source
$remoteHost = 'ubuntu@{0}' -f $ServerIp
$remoteFile = '{0}:~/devops-home-inventory/compose.registry.yaml.next' -f $remoteHost
$sshOptions = @('-i', $KeyPath, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10')

Write-Host 'Checking the remote project and confirming no candidate is already staged...'
& $ssh @sshOptions $remoteHost 'cd ~/devops-home-inventory && test -f release-registry.sh && test -f compose.registry.yaml && test -f deploy.env && test ! -e compose.registry.yaml.next'
if ($LASTEXITCODE -ne 0) {
    throw 'Remote preflight failed. Check SSH access, project files, and any existing .next candidate before retrying.'
}

Write-Host 'Copying only the candidate Compose file to Lightsail...'
& $scp @sshOptions $CandidatePath $remoteFile
if ($LASTEXITCODE -ne 0) { throw 'SCP transfer failed; the VM release script was not run.' }

$localHash = (Get-FileHash -LiteralPath $CandidatePath -Algorithm SHA256).Hash.ToLowerInvariant()
$remoteHashText = & $ssh @sshOptions $remoteHost 'sha256sum ~/devops-home-inventory/compose.registry.yaml.next'
if ($LASTEXITCODE -ne 0) { throw 'Could not read the staged candidate checksum; the VM release script was not run.' }
$remoteHash = ([string]($remoteHashText | Select-Object -First 1) -split '\s+')[0]
if ($remoteHash -cne $localHash) {
    throw 'Transferred candidate checksum differs from the local file; the VM release script was not run.'
}
Write-Host 'Candidate checksum matches on Windows and Lightsail.'

Write-Host 'Running the existing Lightsail release helper...'
& $ssh '-tt' @sshOptions $remoteHost 'cd ~/devops-home-inventory && bash ./release-registry.sh'
if ($LASTEXITCODE -ne 0) {
    throw 'VM release helper failed. Inspect the remote Compose status and logs; do not retry blindly.'
}
Write-Host 'VM checks passed. Refresh the private browser tunnel and confirm the release label and saved item.'