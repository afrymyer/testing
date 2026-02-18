#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Clears temp files, Windows Update cache, and recycle bin to free disk space.
.DESCRIPTION
    Automated disk cleanup targeting common space consumers.
    Safe for Datto RMM deployment on workstations and servers.
.NOTES
    Category: Disk Space / Cleanup
    Est. Time: 5 minutes
    Run As: System/Admin
#>

param(
    [switch]$IncludeWindowsUpdate,
    [switch]$EmptyRecycleBin
)

$ErrorActionPreference = 'SilentlyContinue'

Write-Output "=== Disk Space Cleanup ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Get initial free space
$drive = Get-PSDrive C
$initialFreeGB = [math]::Round($drive.Free / 1GB, 2)
Write-Output "Initial free space (C:): $initialFreeGB GB"

$totalCleared = 0

# 1. Windows Temp
$winTemp = "$env:SystemRoot\Temp"
$tempFiles = Get-ChildItem -Path $winTemp -Recurse -Force -ErrorAction SilentlyContinue
$tempSize = ($tempFiles | Measure-Object -Property Length -Sum).Sum
Remove-Item -Path "$winTemp\*" -Recurse -Force -ErrorAction SilentlyContinue
Write-Output "[OK] Windows Temp: cleared $([math]::Round($tempSize / 1MB, 1)) MB"
$totalCleared += $tempSize

# 2. User Temp folders
$userProfiles = Get-ChildItem "C:\Users" -Directory -ErrorAction SilentlyContinue
foreach ($profile in $userProfiles) {
    $userTemp = Join-Path $profile.FullName "AppData\Local\Temp"
    if (Test-Path $userTemp) {
        $files = Get-ChildItem -Path $userTemp -Recurse -Force -ErrorAction SilentlyContinue
        $size = ($files | Measure-Object -Property Length -Sum).Sum
        Remove-Item -Path "$userTemp\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Output "[OK] $($profile.Name) Temp: cleared $([math]::Round($size / 1MB, 1)) MB"
        $totalCleared += $size
    }
}

# 3. Windows Update Cache (optional)
if ($IncludeWindowsUpdate) {
    Write-Output "Clearing Windows Update cache..."
    Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue
    $wuPath = "$env:SystemRoot\SoftwareDistribution\Download"
    $wuFiles = Get-ChildItem -Path $wuPath -Recurse -Force -ErrorAction SilentlyContinue
    $wuSize = ($wuFiles | Measure-Object -Property Length -Sum).Sum
    Remove-Item -Path "$wuPath\*" -Recurse -Force -ErrorAction SilentlyContinue
    Start-Service -Name wuauserv -ErrorAction SilentlyContinue
    Write-Output "[OK] Windows Update cache: cleared $([math]::Round($wuSize / 1MB, 1)) MB"
    $totalCleared += $wuSize
}

# 4. Recycle Bin (optional)
if ($EmptyRecycleBin) {
    Write-Output "Emptying Recycle Bin..."
    Clear-RecycleBin -Force -ErrorAction SilentlyContinue
    Write-Output "[OK] Recycle Bin emptied."
}

# 5. Browser caches (Chrome, Edge)
foreach ($profile in $userProfiles) {
    $chromePath = Join-Path $profile.FullName "AppData\Local\Google\Chrome\User Data\Default\Cache"
    $edgePath = Join-Path $profile.FullName "AppData\Local\Microsoft\Edge\User Data\Default\Cache"
    foreach ($cachePath in @($chromePath, $edgePath)) {
        if (Test-Path $cachePath) {
            $cacheFiles = Get-ChildItem -Path $cachePath -Recurse -Force -ErrorAction SilentlyContinue
            $cacheSize = ($cacheFiles | Measure-Object -Property Length -Sum).Sum
            Remove-Item -Path "$cachePath\*" -Recurse -Force -ErrorAction SilentlyContinue
            $totalCleared += $cacheSize
        }
    }
}
Write-Output "[OK] Browser caches cleared."

# Final summary
$drive = Get-PSDrive C
$finalFreeGB = [math]::Round($drive.Free / 1GB, 2)
$recoveredGB = [math]::Round($totalCleared / 1GB, 2)

Write-Output ""
Write-Output "=== Summary ==="
Write-Output "Space recovered: ~$recoveredGB GB"
Write-Output "Free space now: $finalFreeGB GB (was $initialFreeGB GB)"
Write-Output "[SUCCESS] Disk cleanup complete."
