<#
.SYNOPSIS
    Maps a network drive for the current user or all users.
.DESCRIPTION
    Creates a persistent network drive mapping with optional
    credential handling. Can target a specific user or apply via
    GPO-style login script.
.NOTES
    Category: Group Policy / Drive Mapping
    Est. Time: 2 minutes
    Run As: Current User or System
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$DriveLetter,

    [Parameter(Mandatory = $true)]
    [string]$UNCPath,

    [string]$Username,
    [string]$Password,
    [switch]$Persistent
)

$ErrorActionPreference = 'Stop'

Write-Output "=== Map Network Drive ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "Drive: ${DriveLetter}:"
Write-Output "Path: $UNCPath"

try {
    # Remove existing mapping if present
    $existing = Get-PSDrive -Name $DriveLetter -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Output "Removing existing mapping for ${DriveLetter}:..."
        net use "${DriveLetter}:" /delete /y 2>&1 | Out-Null
        Start-Sleep -Seconds 1
    }

    # Test UNC path connectivity
    if (-not (Test-Path $UNCPath -ErrorAction SilentlyContinue)) {
        Write-Warning "Cannot reach $UNCPath - the path may not be accessible. Attempting to map anyway..."
    }

    # Map the drive
    $persistFlag = if ($Persistent) { "/persistent:yes" } else { "/persistent:no" }

    if ($Username -and $Password) {
        $result = net use "${DriveLetter}:" $UNCPath /user:$Username $Password $persistFlag 2>&1
    } else {
        $result = net use "${DriveLetter}:" $UNCPath $persistFlag 2>&1
    }

    # Verify
    $mapped = Get-PSDrive -Name $DriveLetter -ErrorAction SilentlyContinue
    if ($mapped) {
        Write-Output "[SUCCESS] ${DriveLetter}: mapped to $UNCPath"
    } else {
        Write-Output "net use output: $result"
        Write-Warning "Drive may not have mapped correctly. Check credentials and network access."
    }
} catch {
    Write-Error "Failed to map drive: $_"
    exit 1
}
