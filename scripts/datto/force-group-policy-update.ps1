#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Forces a Group Policy update and reports applied GPOs.
.DESCRIPTION
    Runs gpupdate /force and displays the resulting applied
    computer and user policies. Useful after GPO changes or
    when drive mappings / policies aren't applying.
.NOTES
    Category: Group Policy Update
    Est. Time: 3 minutes
    Run As: System/Admin
#>

$ErrorActionPreference = 'Stop'

Write-Output "=== Force Group Policy Update ==="
Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "Computer: $env:COMPUTERNAME"

try {
    Write-Output "Running gpupdate /force..."
    $result = gpupdate /force 2>&1
    $result | ForEach-Object { Write-Output "  $_" }
    Write-Output "[OK] Group Policy update completed."

    # Show applied GPOs
    Write-Output ""
    Write-Output "=== Applied Computer Policies ==="
    $computerGPOs = gpresult /Scope Computer /v 2>&1 | Select-String -Pattern "Applied Group Policy Objects|GPO Name"
    if ($computerGPOs) {
        $computerGPOs | ForEach-Object { Write-Output "  $_" }
    } else {
        Write-Output "  (Run gpresult /h report.html for full details)"
    }

    Write-Output ""
    Write-Output "[SUCCESS] Group Policy update forced successfully."
} catch {
    Write-Error "Group Policy update failed: $_"
    exit 1
}
