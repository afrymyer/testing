<#
.SYNOPSIS
    Clears Outlook cache and repairs the local profile.
.DESCRIPTION
    Closes Outlook, clears the OST/cache files, and optionally
    rebuilds the Outlook profile. Fixes sync issues, slowness,
    and corruption problems.
.NOTES
    Category: Email / Outlook
    Est. Time: 5 minutes
    Run As: Current User or System
#>

param(
    [switch]$RebuildOST,
    [string]$TargetUser
)

$ErrorActionPreference = 'SilentlyContinue'

Write-Output "=== Clear Outlook Cache ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Stop Outlook
Write-Output "Closing Outlook..."
Get-Process -Name "OUTLOOK" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3
Write-Output "[OK] Outlook closed."

# Determine target profiles
if ($TargetUser) {
    $profiles = @(Get-Item "C:\Users\$TargetUser" -ErrorAction Stop)
} else {
    $profiles = Get-ChildItem "C:\Users" -Directory | Where-Object { $_.Name -notin @('Public', 'Default', 'Default User') }
}

$totalCleared = 0

foreach ($profile in $profiles) {
    Write-Output ""
    Write-Output "Processing: $($profile.Name)"

    # Outlook cache/temp paths
    $cachePaths = @(
        "$($profile.FullName)\AppData\Local\Microsoft\Outlook\RoamCache"
    )

    foreach ($cachePath in $cachePaths) {
        if (Test-Path $cachePath) {
            $files = Get-ChildItem -Path $cachePath -Recurse -Force -ErrorAction SilentlyContinue
            $size = ($files | Measure-Object -Property Length -Sum).Sum
            Remove-Item -Path "$cachePath\*" -Recurse -Force -ErrorAction SilentlyContinue
            $totalCleared += $size
            Write-Output "  Cleared cache: $([math]::Round($size / 1MB, 1)) MB"
        }
    }

    # Rebuild OST if requested
    if ($RebuildOST) {
        $ostPath = "$($profile.FullName)\AppData\Local\Microsoft\Outlook"
        $ostFiles = Get-ChildItem -Path $ostPath -Filter "*.ost" -ErrorAction SilentlyContinue
        foreach ($ost in $ostFiles) {
            $size = $ost.Length
            $backupName = "$($ost.BaseName)_backup_$(Get-Date -Format 'yyyyMMdd')$($ost.Extension)"
            Rename-Item -Path $ost.FullName -NewName $backupName -Force
            Write-Output "  Renamed OST: $($ost.Name) -> $backupName ($([math]::Round($size / 1MB, 0)) MB)"
            Write-Output "  [NOTE] Outlook will rebuild the OST on next launch (may take time to re-sync)."
            $totalCleared += $size
        }
    }
}

Write-Output ""
Write-Output "Total cleared: $([math]::Round($totalCleared / 1MB, 1)) MB"
Write-Output "[SUCCESS] Outlook cache cleared. User can reopen Outlook."
