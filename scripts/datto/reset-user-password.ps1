#Requires -Modules ActiveDirectory
<#
.SYNOPSIS
    Resets an Active Directory user password and optionally unlocks the account.
.DESCRIPTION
    Resets the specified user's AD password, unlocks the account if locked,
    and optionally forces a password change at next logon.
.NOTES
    Category: Password Reset
    Est. Time: 2 minutes
    Run As: Domain Admin context
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Username,

    [Parameter(Mandatory = $true)]
    [string]$NewPassword,

    [switch]$MustChangeAtLogon,
    [switch]$UnlockAccount
)

$ErrorActionPreference = 'Stop'

Write-Output "=== Reset User Password ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "Target User: $Username"

try {
    # Verify user exists
    $user = Get-ADUser -Identity $Username -Properties LockedOut, PasswordExpired, Enabled
    if (-not $user) {
        Write-Error "User '$Username' not found in Active Directory."
        exit 1
    }

    Write-Output "Found user: $($user.Name) ($($user.SamAccountName))"
    Write-Output "  Enabled: $($user.Enabled)"
    Write-Output "  Locked Out: $($user.LockedOut)"

    # Reset password
    $securePassword = ConvertTo-SecureString -String $NewPassword -AsPlainText -Force
    Set-ADAccountPassword -Identity $Username -NewPassword $securePassword -Reset
    Write-Output "[OK] Password has been reset."

    # Unlock if requested or if account is locked
    if ($UnlockAccount -or $user.LockedOut) {
        Unlock-ADAccount -Identity $Username
        Write-Output "[OK] Account unlocked."
    }

    # Force change at next logon if requested
    if ($MustChangeAtLogon) {
        Set-ADUser -Identity $Username -ChangePasswordAtLogon $true
        Write-Output "[OK] User must change password at next logon."
    }

    Write-Output ""
    Write-Output "[SUCCESS] Password reset complete for $Username."
} catch {
    Write-Error "Failed to reset password: $_"
    exit 1
}
