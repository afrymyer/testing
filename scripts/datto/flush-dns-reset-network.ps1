#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Flushes DNS cache and resets network stack components.
.DESCRIPTION
    Performs a comprehensive network reset: flushes DNS, releases/renews DHCP,
    resets Winsock and TCP/IP stack. Standard first-step for connectivity issues.
.NOTES
    Category: Network / Connectivity
    Est. Time: 3 minutes
    Run As: System/Admin
#>

param(
    [switch]$FullReset,
    [switch]$SkipDHCPRenew
)

$ErrorActionPreference = 'SilentlyContinue'

Write-Output "=== Flush DNS & Reset Network ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# 1. Flush DNS
Write-Output "Flushing DNS resolver cache..."
ipconfig /flushdns | Out-Null
Clear-DnsClientCache -ErrorAction SilentlyContinue
Write-Output "[OK] DNS cache flushed."

# 2. Release and renew DHCP
if (-not $SkipDHCPRenew) {
    Write-Output "Releasing DHCP lease..."
    ipconfig /release | Out-Null
    Start-Sleep -Seconds 2
    Write-Output "Renewing DHCP lease..."
    ipconfig /renew | Out-Null
    Write-Output "[OK] DHCP lease renewed."
}

# 3. Reset Winsock (if full reset)
if ($FullReset) {
    Write-Output "Resetting Winsock catalog..."
    netsh winsock reset | Out-Null
    Write-Output "[OK] Winsock reset."

    Write-Output "Resetting TCP/IP stack..."
    netsh int ip reset | Out-Null
    Write-Output "[OK] TCP/IP stack reset."

    Write-Output ""
    Write-Output "[WARNING] A reboot is required to complete the full network reset."
}

# 4. Show current network config
Write-Output ""
Write-Output "=== Current Network Configuration ==="
$adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
foreach ($adapter in $adapters) {
    $ipInfo = Get-NetIPAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
    $dns = Get-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
    Write-Output "Adapter: $($adapter.Name)"
    Write-Output "  IP: $($ipInfo.IPAddress -join ', ')"
    Write-Output "  DNS: $($dns.ServerAddresses -join ', ')"
    Write-Output ""
}

Write-Output "[SUCCESS] Network reset complete."
