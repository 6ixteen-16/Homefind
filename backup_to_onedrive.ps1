# Homefind - MySQL Backup to Microsoft OneDrive
$ErrorActionPreference = "Stop"

# Load variables from .env
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $scriptDir ".env"
$dbHost = "127.0.0.1"
$dbPort = "3306"
$dbUser = "homefind_app"
$dbPass = ""
$dbName = "homefinder_db"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and !$line.StartsWith("#")) {
            $parts = $line.Split("=", 2)
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $val = $parts[1].Trim().Trim("'").Trim('"')
                if ($key -eq "DB_HOST") { $dbHost = $val }
                if ($key -eq "DB_PORT") { $dbPort = $val }
                if ($key -eq "DB_USER") { $dbUser = $val }
                if ($key -eq "DB_PASS") { $dbPass = $val }
                if ($key -eq "DB_NAME") { $dbName = $val }
            }
        }
    }
}

$onedriveDir = if ($env:OneDrive) { "$env:OneDrive\Homefind_Backups" } else { "$env:USERPROFILE\OneDrive\Homefind_Backups" }
if (!(Test-Path $onedriveDir)) {
    New-Item -ItemType Directory -Path $onedriveDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = Join-Path $onedriveDir "homefinder_db_$timestamp.sql"
$latestFile = Join-Path $onedriveDir "homefinder_db_latest.sql"

$mysqldump = "C:\Program Files\MySQL\MySQL Server 26.7\bin\mysqldump.exe"
if (!(Test-Path $mysqldump)) {
    $found = Get-Command mysqldump -ErrorAction SilentlyContinue
    if ($found) { $mysqldump = $found.Source }
}

Write-Host "============================================================"
Write-Host " HOMEFIND - MYSQL ONEDRIVE BACKUP"
Write-Host "============================================================"
Write-Host "Destination: $backupFile"
Write-Host "Running mysqldump..."

& $mysqldump `
    --host=$dbHost `
    --port=$dbPort `
    --user=$dbUser `
    --password="$dbPass" `
    --skip-masking-policies `
    --no-tablespaces `
    --set-gtid-purged=OFF `
    --single-transaction `
    $dbName `
    --result-file="$backupFile"

if ($LASTEXITCODE -eq 0) {
    Copy-Item -Path $backupFile -Destination $latestFile -Force
    $size = (Get-Item $backupFile).Length
    $sizeKB = [math]::Round($size / 1024, 2)
    Write-Host "`n[SUCCESS] Database successfully dumped to OneDrive!"
    Write-Host "  File: $backupFile"
    Write-Host "  Size: $sizeKB KB"
    Write-Host "  OneDrive will now automatically sync this file to the cloud."
} else {
    Write-Host "`n[ERROR] mysqldump exited with error code $LASTEXITCODE"
}
Write-Host "============================================================"
