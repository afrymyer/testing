#Requires -Modules ExchangeOnlineManagement
<#
.SYNOPSIS
    Exports mailbox permissions report for a user or all mailboxes.
.DESCRIPTION
    Generates a report of Full Access, Send As, and Send on Behalf
    permissions. Useful for audits, offboarding, and troubleshooting.
.NOTES
    Category: Email / Outlook
    Est. Time: 5 minutes
    Run As: Exchange Admin
#>

param(
    [string]$UserEmail,
    [string]$OutputPath = "$env:TEMP\MailboxPermissions_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv",
    [switch]$AllMailboxes
)

$ErrorActionPreference = 'Stop'

Write-Output "=== Export Mailbox Permissions ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

try {
    # Connect to Exchange Online if not already connected
    $session = Get-ConnectionInformation -ErrorAction SilentlyContinue
    if (-not $session) {
        Write-Output "Connecting to Exchange Online..."
        Connect-ExchangeOnline -ShowBanner:$false
    }

    $results = @()

    if ($AllMailboxes) {
        Write-Output "Fetching all mailboxes..."
        $mailboxes = Get-Mailbox -ResultSize Unlimited
    } elseif ($UserEmail) {
        $mailboxes = @(Get-Mailbox -Identity $UserEmail)
    } else {
        Write-Error "Specify -UserEmail or -AllMailboxes"
        exit 1
    }

    Write-Output "Processing $($mailboxes.Count) mailbox(es)..."

    foreach ($mbx in $mailboxes) {
        Write-Output "  Checking: $($mbx.PrimarySmtpAddress)"

        # Full Access permissions
        $fullAccess = Get-MailboxPermission -Identity $mbx.PrimarySmtpAddress |
            Where-Object { $_.User -ne 'NT AUTHORITY\SELF' -and $_.IsInherited -eq $false }
        foreach ($perm in $fullAccess) {
            $results += [PSCustomObject]@{
                Mailbox        = $mbx.PrimarySmtpAddress
                DisplayName    = $mbx.DisplayName
                PermissionType = 'Full Access'
                GrantedTo      = $perm.User
                AccessRights   = ($perm.AccessRights -join ', ')
            }
        }

        # Send As permissions
        $sendAs = Get-RecipientPermission -Identity $mbx.PrimarySmtpAddress |
            Where-Object { $_.Trustee -ne 'NT AUTHORITY\SELF' }
        foreach ($perm in $sendAs) {
            $results += [PSCustomObject]@{
                Mailbox        = $mbx.PrimarySmtpAddress
                DisplayName    = $mbx.DisplayName
                PermissionType = 'Send As'
                GrantedTo      = $perm.Trustee
                AccessRights   = 'SendAs'
            }
        }

        # Send on Behalf
        if ($mbx.GrantSendOnBehalfTo) {
            foreach ($delegate in $mbx.GrantSendOnBehalfTo) {
                $results += [PSCustomObject]@{
                    Mailbox        = $mbx.PrimarySmtpAddress
                    DisplayName    = $mbx.DisplayName
                    PermissionType = 'Send on Behalf'
                    GrantedTo      = $delegate
                    AccessRights   = 'SendOnBehalf'
                }
            }
        }
    }

    # Export results
    if ($results.Count -gt 0) {
        $results | Export-Csv -Path $OutputPath -NoTypeInformation
        Write-Output ""
        Write-Output "[SUCCESS] Exported $($results.Count) permission entries to:"
        Write-Output "  $OutputPath"
    } else {
        Write-Output ""
        Write-Output "[INFO] No delegated permissions found."
    }

    # Display summary table
    Write-Output ""
    Write-Output "=== Permission Summary ==="
    $results | Group-Object PermissionType | ForEach-Object {
        Write-Output "  $($_.Name): $($_.Count)"
    }

} catch {
    Write-Error "Export failed: $_"
    exit 1
}
