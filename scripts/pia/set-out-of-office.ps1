#Requires -Modules ExchangeOnlineManagement
<#
.SYNOPSIS
    Sets or removes Out of Office (auto-reply) for a mailbox.
.DESCRIPTION
    Configures automatic reply settings for a user mailbox in
    Exchange Online. Can set scheduled or indefinite auto-replies.
.NOTES
    Category: Email / Outlook
    Est. Time: 3 minutes
    Run As: Exchange Admin
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$UserEmail,

    [ValidateSet('Enable', 'Disable', 'Scheduled')]
    [string]$Action = 'Enable',

    [string]$InternalMessage = "I am currently out of the office and will respond to your email upon my return. If this is urgent, please contact our help desk.",
    [string]$ExternalMessage = "Thank you for your email. I am currently out of the office and will respond upon my return.",
    [datetime]$StartDate,
    [datetime]$EndDate,
    [switch]$ExternalOnly
)

$ErrorActionPreference = 'Stop'

Write-Output "=== Set Out of Office ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "Mailbox: $UserEmail"
Write-Output "Action: $Action"

try {
    # Connect to Exchange Online if not already connected
    $session = Get-ConnectionInformation -ErrorAction SilentlyContinue
    if (-not $session) {
        Write-Output "Connecting to Exchange Online..."
        Connect-ExchangeOnline -ShowBanner:$false
    }

    # Verify mailbox exists
    $mbx = Get-Mailbox -Identity $UserEmail -ErrorAction Stop
    Write-Output "Found mailbox: $($mbx.DisplayName)"

    # Get current settings
    $current = Get-MailboxAutoReplyConfiguration -Identity $UserEmail
    Write-Output "Current state: $($current.AutoReplyState)"

    switch ($Action) {
        'Enable' {
            $params = @{
                Identity         = $UserEmail
                AutoReplyState   = 'Enabled'
                InternalMessage  = $InternalMessage
                ExternalMessage  = $ExternalMessage
                ExternalAudience = if ($ExternalOnly) { 'Known' } else { 'All' }
            }
            Set-MailboxAutoReplyConfiguration @params
            Write-Output "[OK] Out of Office ENABLED (indefinite)."
        }
        'Scheduled' {
            if (-not $StartDate -or -not $EndDate) {
                Write-Error "Scheduled mode requires -StartDate and -EndDate."
                exit 1
            }
            $params = @{
                Identity         = $UserEmail
                AutoReplyState   = 'Scheduled'
                StartTime        = $StartDate
                EndTime          = $EndDate
                InternalMessage  = $InternalMessage
                ExternalMessage  = $ExternalMessage
                ExternalAudience = if ($ExternalOnly) { 'Known' } else { 'All' }
            }
            Set-MailboxAutoReplyConfiguration @params
            Write-Output "[OK] Out of Office SCHEDULED."
            Write-Output "  Start: $($StartDate.ToString('yyyy-MM-dd HH:mm'))"
            Write-Output "  End: $($EndDate.ToString('yyyy-MM-dd HH:mm'))"
        }
        'Disable' {
            Set-MailboxAutoReplyConfiguration -Identity $UserEmail -AutoReplyState Disabled
            Write-Output "[OK] Out of Office DISABLED."
        }
    }

    Write-Output ""
    Write-Output "[SUCCESS] Auto-reply configuration updated for $UserEmail."

} catch {
    Write-Error "Failed to set out of office: $_"
    exit 1
}
