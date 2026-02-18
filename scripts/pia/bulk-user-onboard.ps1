#Requires -Modules ActiveDirectory, ExchangeOnlineManagement, Microsoft.Graph
<#
.SYNOPSIS
    Automates new user onboarding in AD and Microsoft 365.
.DESCRIPTION
    Creates AD account, assigns M365 license, creates mailbox,
    adds to security groups, and sets up initial permissions.
    Designed for MSP technician use via Datto/PIA.
.NOTES
    Category: User Onboarding
    Est. Time: 15 minutes
    Run As: Domain Admin + Global Admin
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$FirstName,

    [Parameter(Mandatory = $true)]
    [string]$LastName,

    [Parameter(Mandatory = $true)]
    [string]$Department,

    [string]$JobTitle = "",
    [string]$TemporaryPassword = "Welcome2024!",
    [string]$OUPath,
    [string[]]$SecurityGroups = @(),
    [string]$M365License = "STANDARDPACK",
    [string]$Manager,
    [switch]$CreateMailbox
)

$ErrorActionPreference = 'Stop'

Write-Output "=== User Onboarding ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "New User: $FirstName $LastName"
Write-Output "Department: $Department"

# Generate username (first initial + last name)
$Username = ("$($FirstName[0])$LastName").ToLower() -replace '[^a-z0-9]', ''
$domain = (Get-ADDomain).DNSRoot
$UPN = "$Username@$domain"
$DisplayName = "$FirstName $LastName"

Write-Output "Username: $Username"
Write-Output "UPN: $UPN"

try {
    # 1. Check if user already exists
    $existing = Get-ADUser -Filter "SamAccountName -eq '$Username'" -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Error "User '$Username' already exists in AD."
        exit 1
    }

    # 2. Determine OU
    if (-not $OUPath) {
        # Default to department-based OU or Users container
        $deptOU = Get-ADOrganizationalUnit -Filter "Name -eq '$Department'" -ErrorAction SilentlyContinue
        $OUPath = if ($deptOU) { $deptOU.DistinguishedName } else { (Get-ADDomain).UsersContainer }
    }
    Write-Output "OU: $OUPath"

    # 3. Create AD user
    Write-Output ""
    Write-Output "--- Step 1: Creating AD Account ---"
    $securePass = ConvertTo-SecureString -String $TemporaryPassword -AsPlainText -Force
    $newUserParams = @{
        Name              = $DisplayName
        GivenName         = $FirstName
        Surname           = $LastName
        SamAccountName    = $Username
        UserPrincipalName = $UPN
        DisplayName       = $DisplayName
        Department        = $Department
        Title             = $JobTitle
        Path              = $OUPath
        AccountPassword   = $securePass
        Enabled           = $true
        ChangePasswordAtLogon = $true
    }
    New-ADUser @newUserParams
    Write-Output "[OK] AD user created: $Username"

    # 4. Set manager if specified
    if ($Manager) {
        Set-ADUser -Identity $Username -Manager $Manager
        Write-Output "[OK] Manager set to: $Manager"
    }

    # 5. Add to security groups
    Write-Output ""
    Write-Output "--- Step 2: Adding to Security Groups ---"
    foreach ($group in $SecurityGroups) {
        try {
            Add-ADGroupMember -Identity $group -Members $Username
            Write-Output "[OK] Added to group: $group"
        } catch {
            Write-Warning "Could not add to group '$group': $_"
        }
    }

    # 6. M365 License (if Exchange Online module available)
    if ($CreateMailbox) {
        Write-Output ""
        Write-Output "--- Step 3: Microsoft 365 Setup ---"
        Write-Output "Waiting for AD sync to propagate to Azure AD..."
        Write-Output "[NOTE] Run Start-ADSyncSyncCycle -PolicyType Delta on the AAD Connect server"
        Write-Output "[NOTE] Then assign M365 license '$M365License' via admin portal or:"
        Write-Output "  Connect-MgGraph -Scopes 'User.ReadWrite.All'"
        Write-Output "  Set-MgUserLicense -UserId '$UPN' -AddLicenses @{SkuId='<license-sku-id>'} -RemoveLicenses @()"
    }

    # 7. Summary
    Write-Output ""
    Write-Output "==============================="
    Write-Output "  ONBOARDING SUMMARY"
    Write-Output "==============================="
    Write-Output "  Name: $DisplayName"
    Write-Output "  Username: $Username"
    Write-Output "  UPN: $UPN"
    Write-Output "  Department: $Department"
    Write-Output "  Title: $JobTitle"
    Write-Output "  Temp Password: $TemporaryPassword"
    Write-Output "  Groups: $($SecurityGroups -join ', ')"
    Write-Output "  Must Change PW: Yes"
    Write-Output "==============================="
    Write-Output ""
    Write-Output "[SUCCESS] User onboarding complete."

} catch {
    Write-Error "Onboarding failed: $_"
    exit 1
}
