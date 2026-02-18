#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Checks disk health using SMART data and Windows Storage diagnostics.
.DESCRIPTION
    Queries SMART status, disk reliability counters, and runs a
    quick storage health check. Flags drives that may be failing.
.NOTES
    Category: Disk Health Check
    Est. Time: 3 minutes
    Run As: System/Admin
#>

$ErrorActionPreference = 'SilentlyContinue'

Write-Output "=== Disk Health Check ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "Computer: $env:COMPUTERNAME"
Write-Output ""

# 1. Physical disk info
Write-Output "--- Physical Disks ---"
$disks = Get-PhysicalDisk
foreach ($disk in $disks) {
    $status = $disk.HealthStatus
    $statusIcon = if ($status -eq 'Healthy') { '[OK]' } else { '[WARNING]' }

    Write-Output "$statusIcon Disk $($disk.DeviceId): $($disk.FriendlyName)"
    Write-Output "     Media: $($disk.MediaType) | Size: $([math]::Round($disk.Size / 1GB, 0)) GB"
    Write-Output "     Health: $status | Operational: $($disk.OperationalStatus)"
    Write-Output ""
}

# 2. SMART via WMI
Write-Output "--- SMART Status (WMI) ---"
$smartData = Get-WmiObject -Namespace "root\WMI" -Class "MSStorageDriver_FailurePredictStatus" -ErrorAction SilentlyContinue
if ($smartData) {
    foreach ($drive in $smartData) {
        $predicted = if ($drive.PredictFailure) { "[CRITICAL] Failure predicted!" } else { "[OK] No failure predicted" }
        Write-Output "  Instance: $($drive.InstanceName.Split('\')[-1])"
        Write-Output "  $predicted"
        Write-Output ""
    }
} else {
    Write-Output "  SMART data not available via WMI (may require manufacturer tools)."
}

# 3. Volume health
Write-Output "--- Volume Health ---"
$volumes = Get-Volume | Where-Object { $_.DriveLetter -and $_.DriveType -eq 'Fixed' }
foreach ($vol in $volumes) {
    $freePercent = if ($vol.Size -gt 0) { [math]::Round(($vol.SizeRemaining / $vol.Size) * 100, 1) } else { 0 }
    $spaceIcon = if ($freePercent -lt 10) { '[WARNING]' } elseif ($freePercent -lt 20) { '[CAUTION]' } else { '[OK]' }

    Write-Output "$spaceIcon $($vol.DriveLetter): $($vol.FileSystemLabel)"
    Write-Output "     Size: $([math]::Round($vol.Size / 1GB, 1)) GB | Free: $([math]::Round($vol.SizeRemaining / 1GB, 1)) GB ($freePercent%)"
    Write-Output "     Health: $($vol.HealthStatus)"
    Write-Output ""
}

# 4. Recent disk errors in event log
Write-Output "--- Recent Disk Errors (last 7 days) ---"
$diskErrors = Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    ProviderName = 'disk', 'ntfs', 'storahci'
    Level = 1,2,3
    StartTime = (Get-Date).AddDays(-7)
} -MaxEvents 10 -ErrorAction SilentlyContinue

if ($diskErrors) {
    foreach ($evt in $diskErrors) {
        Write-Output "  [$($evt.TimeCreated.ToString('yyyy-MM-dd HH:mm'))] $($evt.ProviderName): $($evt.Message.Substring(0, [Math]::Min(120, $evt.Message.Length)))"
    }
} else {
    Write-Output "  [OK] No disk errors in the last 7 days."
}

Write-Output ""
Write-Output "=== Disk Health Check Complete ==="
