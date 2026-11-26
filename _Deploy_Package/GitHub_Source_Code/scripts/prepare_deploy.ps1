$source = "C:/Users/Geovani Silva/Documents/EscopoV3/EscopoV3 (1)~1"
$deploy = "$source/_Deploy_Package"
$github = "$deploy/GitHub_Source_Code"
$cloudflare = "$deploy/Cloudflare_Build_Dist"

Write-Host "Cleaning up previous deploy package..."
if (Test-Path $deploy) { Remove-Item $deploy -Recurse -Force }
New-Item -ItemType Directory -Path $source/_Deploy_Package -Force | Out-Null
New-Item -ItemType Directory -Path $github -Force | Out-Null
New-Item -ItemType Directory -Path $cloudflare -Force | Out-Null

Write-Host "Copying Source Code for GitHub..."
# Using Robocopy to exclude heavy folders
# Excludes: node_modules, dist, dist-electron, release, .git, .idea, .vscode, _Deploy_Package
# Robocopy returns exit codes that PowerShell considers errors if > 0. We suppress this.
try {
    robocopy $source $github /E /XD node_modules dist dist-electron release .git .idea .vscode _Deploy_Package build logs "System Volume Information" /XF *.log *.lock
} catch {
    # Robocopy throws error on exit code > 8 (serious error). 1-7 are success/warnings.
}

Write-Host "Copying Web Build for Cloudflare..."
if (Test-Path "$source/dist") {
    try {
        robocopy "$source/dist" $cloudflare /E
    } catch { }
} else {
    Write-Host "WARNING: dist folder not found! Build might have failed." -ForegroundColor Red
}

Write-Host "Deployment package created at: $deploy"
Write-Host "Files for GITHUB are in: $github"
Write-Host "Files for CLOUDFLARE are in: $cloudflare"
