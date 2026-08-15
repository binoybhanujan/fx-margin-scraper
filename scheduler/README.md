# Daily scheduling

Run the scraper once per day so `data/consolidated/latest.csv` stays current for the frontend.

## Windows Task Scheduler

1. Open **Task Scheduler** → **Create Basic Task**.
2. Name: `FX Margin Scraper`.
3. Trigger: **Daily** (e.g. 8:00 AM).
4. Action: **Start a program**.
5. Program: path to `scheduler\run_daily.bat`.
6. Start in: project root folder.

Or from an elevated PowerShell (adjust paths):

```powershell
$action = New-ScheduledTaskAction -Execute "C:\Users\USER\Documents\Python Projects\fx-margin-scraper\scheduler\run_daily.bat"
$trigger = New-ScheduledTaskTrigger -Daily -At 8:00AM
Register-ScheduledTask -TaskName "FXMarginScraper" -Action $action -Trigger $trigger
```

## Linux / macOS (cron)

```cron
0 8 * * * cd /path/to/fx-margin-scraper && python scripts/scrape.py -q
```

## Output locations

| Path | Description |
|------|-------------|
| `data/raw/{bank}/{date}.csv` | Per-bank daily snapshot |
| `data/raw/{bank}/{date}.json` | Per-bank daily snapshot (JSON) |
| `data/consolidated/latest.csv` | All banks, wide format |
| `data/consolidated/latest_long.csv` | All banks, long format (good for charts) |
| `data/consolidated/{date}.csv` | Dated consolidated copy |
