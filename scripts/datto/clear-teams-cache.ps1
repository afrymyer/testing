<#
.SYNOPSIS
    Clears Microsoft Teams cache to resolve common Teams issues.
.DESCRIPTION
    Stops Teams processes, clears all cache folders, and optionally
    restarts Teams. Fixes most Teams performance and loading issues.
.NOTES
    Category: Microsoft Teams
    Est. Time: 3 minutes
    Run As: Current User or System
#>

param(
    [switch]$RestartTeams,
    [string]$TargetUser
)

$ErrorActionPreference = 'SilentlyContinue'

Write-Output "=== Clear Microsoft Teams Cache ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Determine target user profiles
if ($TargetUser) {
    $profiles = @(Get-Item "C:\Users\$TargetUser" -ErrorAction Stop)
} else {
    $profiles = Get-ChildItem "C:\Users" -Directory | Where-Object { $_.Name -notin @('Public', 'Default', 'Default User') }
}

# Stop Teams processes
Write-Output "Stopping Teams processes..."
Get-Process -Name "ms-teams", "Teams" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3
Write-Output "[OK] Teams processes stopped."

$totalCleared = 0

foreach ($profile in $profiles) {
    Write-Output ""
    Write-Output "Processing: $($profile.Name)"

    # New Teams (Teams 2.0) cache paths
    $newTeamsCache = @(
        "$($profile.FullName)\AppData\Local\Packages\MSTeams_8wekyb3d8bbwe\LocalCache"
    )

    # Classic Teams cache paths
    $classicTeamsCachePaths = @(
        "$($profile.FullName)\AppData\Roaming\Microsoft\Teams\Cache",
        "$($profile.FullName)\AppData\Roaming\Microsoft\Teams\blob_storage",
        "$($profile.FullName)\AppData\Roaming\Microsoft\Teams\databases",
        "$($profile.FullName)\AppData\Roaming\Microsoft\Teams\GPUCache",
        "$($profile.FullName)\AppData\Roaming\Microsoft\Teams\IndexedDB",
        "$($profile.FullName)\AppData\Roaming\Microsoft\Teams\Local Storage",
        "$($profile.FullName)\AppData\Roaming\Microsoft\Teams\Code Cache"
    )

    $allPaths = $newTeamsCache + $classicTeamsCachePaths

    foreach ($cachePath in $allPaths) {
        if (Test-Path $cachePath) {
            $files = Get-ChildItem -Path $cachePath -Recurse -Force -ErrorAction SilentlyContinue
            $size = ($files | Measure-Object -Property Length -Sum).Sum
            Remove-Item -Path "$cachePath\*" -Recurse -Force -ErrorAction SilentlyContinue
            $totalCleared += $size
            Write-Output "  Cleared: $cachePath ($([math]::Round($size / 1MB, 1)) MB)"
        }
    }
}

Write-Output ""
Write-Output "Total cache cleared: $([math]::Round($totalCleared / 1MB, 1)) MB"

if ($RestartTeams) {
    Write-Output "Restarting Teams..."
    $teamsPath = "$env:LOCALAPPDATA\Microsoft\WindowsApps\ms-teams.exe"
    if (Test-Path $teamsPath) {
        Start-Process $teamsPath
    } else {
        # Try classic Teams
        $classicPath = "$env:LOCALAPPDATA\Microsoft\Teams\Update.exe"
        if (Test-Path $classicPath) {
            Start-Process $classicPath -ArgumentList "--processStart", "Teams.exe"
        }
    }
    Write-Output "[OK] Teams restarted."
}

Write-Output "[SUCCESS] Teams cache cleared."
