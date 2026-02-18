#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Installs a network printer by IP address or UNC path.
.DESCRIPTION
    Adds a TCP/IP printer port and installs a printer using a
    Windows built-in or pre-installed driver. For Datto RMM deployment.
.NOTES
    Category: Printer Issue
    Est. Time: 5 minutes
    Run As: System/Admin
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$PrinterName,

    [Parameter(Mandatory = $true)]
    [string]$PrinterIP,

    [string]$DriverName = "Microsoft IPP Class Driver",
    [switch]$SetAsDefault
)

$ErrorActionPreference = 'Stop'

Write-Output "=== Install Network Printer ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "Printer: $PrinterName"
Write-Output "IP: $PrinterIP"
Write-Output "Driver: $DriverName"

try {
    # Test connectivity
    Write-Output "Testing connectivity to $PrinterIP..."
    $ping = Test-Connection -ComputerName $PrinterIP -Count 2 -Quiet
    if (-not $ping) {
        Write-Warning "Cannot ping $PrinterIP. Printer may be off or firewall is blocking. Continuing anyway..."
    } else {
        Write-Output "[OK] Printer is reachable."
    }

    # Check if printer already exists
    $existing = Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Output "Printer '$PrinterName' already exists. Removing..."
        Remove-Printer -Name $PrinterName -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    # Create TCP/IP port
    $portName = "TCP_$PrinterIP"
    $existingPort = Get-PrinterPort -Name $portName -ErrorAction SilentlyContinue
    if (-not $existingPort) {
        Write-Output "Creating printer port: $portName"
        Add-PrinterPort -Name $portName -PrinterHostAddress $PrinterIP
    } else {
        Write-Output "Port $portName already exists."
    }

    # Verify driver is available
    $driver = Get-PrinterDriver -Name $DriverName -ErrorAction SilentlyContinue
    if (-not $driver) {
        Write-Output "Driver '$DriverName' not found. Listing available drivers..."
        Get-PrinterDriver | Select-Object Name | ForEach-Object { Write-Output "  - $($_.Name)" }
        Write-Error "Please specify a valid driver name from the list above."
        exit 1
    }

    # Install printer
    Write-Output "Adding printer..."
    Add-Printer -Name $PrinterName -PortName $portName -DriverName $DriverName
    Write-Output "[OK] Printer '$PrinterName' installed."

    # Set as default if requested
    if ($SetAsDefault) {
        (Get-CimInstance -ClassName Win32_Printer -Filter "Name='$PrinterName'") |
            Invoke-CimMethod -MethodName SetDefaultPrinter | Out-Null
        Write-Output "[OK] Set as default printer."
    }

    # Print test page
    Write-Output ""
    Write-Output "[SUCCESS] Printer '$PrinterName' installed successfully."
    Write-Output "IP: $PrinterIP | Port: $portName | Driver: $DriverName"
} catch {
    Write-Error "Failed to install printer: $_"
    exit 1
}
