# Runs both scrapers once and appends the output to backend/data/scrape.log.
# Meant to be started by Windows Task Scheduler (see "Daily scraping" in the README).
$backend = Split-Path -Parent $PSScriptRoot
Set-Location $backend

$log = Join-Path $backend "data\scrape.log"
"=== $(Get-Date -Format s) ===" | Out-File -Append -Encoding utf8 $log
deno task scrape:all 2>&1 | Out-File -Append -Encoding utf8 $log
