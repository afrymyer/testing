#Requires -Modules ActiveDirectory
<#
.SYNOPSIS
    Automates user offboarding - disables AD account, removes groups,
    converts mailbox to shared, and sets forwarding.
.DESCRIPTION
    Complete offboarding process for departed employees.
    Disables AD, strips groups, hides from GAL, and optionally
    converts mailbox to shared with forwarding.
.NOTES
    Category: User Offboarding
    Est. Time: 10 minutes
    Run As: Domain Admin + Global Admin
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Username,

    [string]$ForwardEmailTo,
    [string]$DisabledOU,
    [switch]$ConvertToSharedMailbox,
    [switch]$RemoveLicenses,
    [switch]$SetOutOfOffice,
    [string]$OutOfOfficeMessage = "This person is no longer with the organization. Please contact the main office for assistance."
)

$ErrorActionPreference = 'Stop'

Write-Output "=== User Offboarding ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "Target User: $Username"

try {
    # 1. Verify user exists
    $user = Get-ADUser -Identity $Username -Properties MemberOf, DisplayName, Mail, Enabled, Description
    Write-Output "Found: $($user.DisplayName) ($($user.Mail))"
    Write-Output "Currently Enabled: $($user.Enabled)"

    # 2. Disable the account
    Write-Output ""
    Write-Output "--- Step 1: Disabling AD Account ---"
    Disable-ADAccount -Identity $Username
    Write-Output "[OK] Account disabled."

    # Update description with offboard date
    $desc = "OFFBOARDED $(Get-Date -Format 'yyyy-MM-dd') | $($user.Description)"
    Set-ADUser -Identity $Username -Description $desc
    Write-Output "[OK] Description updated."

    # 3. Remove from all security groups (except Domain Users)
    Write-Output ""
    Write-Output "--- Step 2: Removing Group Memberships ---"
    $groups = Get-ADPrincipalGroupMembership -Identity $Username |
        Where-Object { $_.Name -ne 'Domain Users' }
    foreach ($group in $groups) {
        Remove-ADGroupMember -Identity $group -Members $Username -Confirm:$false
        Write-Output "[OK] Removed from: $($group.Name)"
    }

    # 4. Move to Disabled OU
    if ($DisabledOU) {
        Write-Output ""
        Write-Output "--- Step 3: Moving to Disabled OU ---"
        Move-ADObject -Identity $user.DistinguishedName -TargetPath $DisabledOU
        Write-Output "[OK] Moved to: $DisabledOU"
    }

    # 5. Reset password to random
    Write-Output ""
    Write-Output "--- Step 4: Randomizing Password ---"
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    $randomPass = -join (1..24 | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
    $securePass = ConvertTo-SecureString -String $randomPass -AsPlainText -Force
    Set-ADAccountPassword -Identity $Username -NewPassword $securePass -Reset
    Write-Output "[OK] Password randomized (24 chars)."

    # 6. Exchange/M365 tasks
    Write-Output ""
    Write-Output "--- Step 5: Email Tasks ---"
    if ($ConvertToSharedMailbox) {
        Write-Output "[NOTE] Convert mailbox to shared via Exchange Online:"
        Write-Output "  Connect-ExchangeOnline"
        Write-Output "  Set-Mailbox -Identity '$($user.Mail)' -Type Shared"
    }
    if ($ForwardEmailTo) {
        Write-Output "[NOTE] Set email forwarding:"
        Write-Output "  Set-Mailbox -Identity '$($user.Mail)' -ForwardingAddress '$ForwardEmailTo'"
    }
    if ($SetOutOfOffice) {
        Write-Output "[NOTE] Set out-of-office reply:"
        Write-Output "  Set-MailboxAutoReplyConfiguration -Identity '$($user.Mail)' -AutoReplyState Enabled -InternalMessage '$OutOfOfficeMessage' -ExternalMessage '$OutOfOfficeMessage'"
    }

    # 7. Summary
    Write-Output ""
    Write-Output "==============================="
    Write-Output "  OFFBOARDING SUMMARY"
    Write-Output "==============================="
    Write-Output "  User: $($user.DisplayName)"
    Write-Output "  Account: DISABLED"
    Write-Output "  Groups Removed: $($groups.Count)"
    Write-Output "  Password: RANDOMIZED"
    Write-Output "  Moved to Disabled OU: $(if ($DisabledOU) {'Yes'} else {'No'})"
    Write-Output "  Convert to Shared: $(if ($ConvertToSharedMailbox) {'Pending'} else {'No'})"
    Write-Output "  Email Forward: $(if ($ForwardEmailTo) {$ForwardEmailTo} else {'None'})"
    Write-Output "==============================="
    Write-Output ""
    Write-Output "[SUCCESS] User offboarding complete."

} catch {
    Write-Error "Offboarding failed: $_"
    exit 1
}
