#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Clears the print spooler and removes stuck print jobs.
.DESCRIPTION
    Stops the Print Spooler service, clears all pending print jobs,
    and restarts the service. Safe for Datto RMM deployment.
.NOTES
    Category: Printer Issue
    Est. Time: 2 minutes
    Run As: System/Admin
#>

param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

Write-Output "=== Clear Print Spooler ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

try {
    # Stop Print Spooler
    Write-Output "Stopping Print Spooler service..."
    Stop-Service -Name Spooler -Force
    Start-Sleep -Seconds 2

    # Clear print queue files
    $spoolPath = "$env:SystemRoot\System32\spool\PRINTERS"
    $files = Get-ChildItem -Path $spoolPath -ErrorAction SilentlyContinue
    if ($files) {
        Write-Output "Removing $($files.Count) stuck print job(s)..."
        Remove-Item -Path "$spoolPath\*" -Force -Recurse
    } else {
        Write-Output "No stuck print jobs found."
    }

    # Restart Print Spooler
    Write-Output "Starting Print Spooler service..."
    Start-Service -Name Spooler
    Start-Sleep -Seconds 2

    # Verify service is running
    $svc = Get-Service -Name Spooler
    if ($svc.Status -eq 'Running') {
        Write-Output "[SUCCESS] Print Spooler is running. Queue cleared."
    } else {
        Write-Warning "Print Spooler status: $($svc.Status)"
    }
} catch {
    Write-Error "Failed to clear print spooler: $_"
    exit 1
}
