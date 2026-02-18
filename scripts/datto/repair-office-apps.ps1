#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Repairs Microsoft Office (Click-to-Run) installation.
.DESCRIPTION
    Triggers an online or quick repair of the Office C2R installation.
    Fixes crashes, missing features, and license activation issues.
.NOTES
    Category: Office App Repair
    Est. Time: 10 minutes
    Run As: System/Admin
#>

param(
    [ValidateSet('Quick', 'Online')]
    [string]$RepairType = 'Quick'
)

$ErrorActionPreference = 'Stop'

Write-Output "=== Repair Office Apps ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "Repair Type: $RepairType"

try {
    # Find Office Click-to-Run installation
    $c2rPath = "$env:CommonProgramFiles\Microsoft Shared\ClickToRun\OfficeClickToRun.exe"
    if (-not (Test-Path $c2rPath)) {
        # Try x86
        $c2rPath = "${env:CommonProgramFiles(x86)}\Microsoft Shared\ClickToRun\OfficeClickToRun.exe"
    }

    if (-not (Test-Path $c2rPath)) {
        Write-Error "Office Click-to-Run not found. Office may be MSI-based or not installed."
        exit 1
    }

    Write-Output "Found Office C2R at: $c2rPath"

    # Close Office apps first
    $officeProcesses = @('WINWORD', 'EXCEL', 'POWERPNT', 'OUTLOOK', 'ONENOTE', 'MSACCESS', 'MSPUB')
    foreach ($proc in $officeProcesses) {
        $running = Get-Process -Name $proc -ErrorAction SilentlyContinue
        if ($running) {
            Write-Output "Closing $proc..."
            $running | Stop-Process -Force
        }
    }
    Start-Sleep -Seconds 3

    # Run repair
    if ($RepairType -eq 'Quick') {
        Write-Output "Starting Quick Repair..."
        $args = "scenario=Repair platform=x64 culture=en-us RepairType=QuickRepair DisplayLevel=False"
    } else {
        Write-Output "Starting Online Repair (requires internet)..."
        $args = "scenario=Repair platform=x64 culture=en-us RepairType=FullRepair DisplayLevel=False"
    }

    $process = Start-Process -FilePath $c2rPath -ArgumentList $args -Wait -PassThru
    if ($process.ExitCode -eq 0) {
        Write-Output "[SUCCESS] Office $RepairType repair completed successfully."
    } else {
        Write-Output "[WARNING] Repair exited with code: $($process.ExitCode)"
        Write-Output "You may need to run an Online repair manually."
    }
} catch {
    Write-Error "Office repair failed: $_"
    exit 1
}
