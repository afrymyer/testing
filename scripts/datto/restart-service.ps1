#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Restarts a specified Windows service with status verification.
.DESCRIPTION
    Gracefully stops and restarts a Windows service. Includes timeout handling
    and verification that the service recovers properly.
.NOTES
    Category: Service Restart
    Est. Time: 2 minutes
    Run As: System/Admin
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$ServiceName,

    [int]$TimeoutSeconds = 30,
    [switch]$ForceKill
)

$ErrorActionPreference = 'Stop'

Write-Output "=== Restart Windows Service ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "Service: $ServiceName"

try {
    $svc = Get-Service -Name $ServiceName -ErrorAction Stop
    Write-Output "Display Name: $($svc.DisplayName)"
    Write-Output "Current Status: $($svc.Status)"

    if ($svc.Status -eq 'Running') {
        Write-Output "Stopping service..."
        Stop-Service -Name $ServiceName -Force -ErrorAction Stop
        $svc.WaitForStatus('Stopped', [TimeSpan]::FromSeconds($TimeoutSeconds))
        Write-Output "[OK] Service stopped."
    } elseif ($svc.Status -eq 'Stopped') {
        Write-Output "Service is already stopped."
    } else {
        Write-Output "Service is in state: $($svc.Status)"
        if ($ForceKill) {
            Write-Output "Force-killing service process..."
            $wmiSvc = Get-WmiObject Win32_Service -Filter "Name='$ServiceName'"
            if ($wmiSvc.ProcessId -gt 0) {
                Stop-Process -Id $wmiSvc.ProcessId -Force
                Start-Sleep -Seconds 3
            }
        }
    }

    Write-Output "Starting service..."
    Start-Service -Name $ServiceName -ErrorAction Stop
    $svc = Get-Service -Name $ServiceName
    $svc.WaitForStatus('Running', [TimeSpan]::FromSeconds($TimeoutSeconds))

    Write-Output ""
    Write-Output "[SUCCESS] $($svc.DisplayName) is now $($svc.Status)."
} catch {
    Write-Error "Failed to restart service '$ServiceName': $_"
    exit 1
}
