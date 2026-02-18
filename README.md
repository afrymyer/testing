# Autotask Ticket Analysis Tool

Analyzes Autotask PSA tickets to identify quick-hitter tasks (5-20 min) and maps them to ready-made PowerShell scripts for Datto RMM and M365 admin operations.

## Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org))
- **Autotask PSA** API credentials (optional — demo mode works without them)

## Quick Start

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd autotask-analysis-tool

# 2. Install dependencies
npm install

# 3. (Optional) Configure Autotask API credentials
cp .env.example .env
# Edit .env with your Autotask API credentials

# 4. Start the server
npm start
```

Open **http://localhost:3000** in your browser.

## Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```env
# Get these from Autotask Admin > Resources > API User
AUTOTASK_API_USER=api.user@yourdomain.com
AUTOTASK_API_SECRET=your-api-secret-here
AUTOTASK_API_INTEGRATION_CODE=your-integration-code

# Your Autotask zone URL (check your Autotask login URL to determine zone)
# Zone 1: https://webservices1.autotask.net
# Zone 6: https://webservices6.autotask.net
# Zone 12: https://webservices12.autotask.net
AUTOTASK_API_ZONE=https://webservices6.autotask.net

PORT=3000
```

### Finding your Autotask API zone

Your zone matches your Autotask login URL. If you log in at `https://ww6.autotask.net`, your API zone is `https://webservices6.autotask.net`.

### Creating an API user in Autotask

1. Go to **Admin > Resources (Users)** in Autotask
2. Create a new API-only user
3. Assign the **API User** security level
4. Generate an integration code under **Admin > Extensions & Integrations > Other Extensions > REST API**

## Usage

### Demo Mode (no credentials needed)

Click **"Load Demo Tickets"** on the dashboard. This loads 18 sample MSP tickets and runs the full analysis pipeline so you can see how categorization, scoring, and script mapping work.

### Live Mode (with Autotask credentials)

Click **"Fetch Tickets"** to pull open tickets from your Autotask instance. The tool will:

1. Fetch all open tickets (excludes Complete and Waiting Customer)
2. Categorize each ticket into one of 14 types
3. Score automation potential (0-95%)
4. Flag quick hitters (5-20 min estimated resolution)
5. Map each ticket to the relevant PowerShell fix scripts

### Using the Scripts

Each ticket card shows suggested scripts. Click any script button to:

- **View** the full PowerShell source
- **Copy to clipboard** for pasting into Datto RMM or a remote PS session
- **Download as .ps1** to upload to your RMM component library

## PowerShell Scripts

### Datto RMM Scripts (`scripts/datto/`)

| Script | Use Case | Est. Time |
|--------|----------|-----------|
| `clear-print-spooler.ps1` | Stuck print jobs, spooler crashes | 2 min |
| `reset-user-password.ps1` | AD password reset + account unlock | 2 min |
| `clear-disk-space.ps1` | Low disk: temps, browser cache, WU cache | 5 min |
| `restart-service.ps1` | Stopped/hung Windows services | 2 min |
| `flush-dns-reset-network.ps1` | DNS flush, DHCP renew, Winsock reset | 3 min |
| `force-group-policy-update.ps1` | GPO not applying, drive mapping issues | 3 min |
| `clear-teams-cache.ps1` | Teams blank screen, performance issues | 3 min |
| `clear-outlook-cache.ps1` | Outlook crashes, sync problems | 5 min |
| `repair-office-apps.ps1` | Office crashes, activation issues | 10 min |
| `map-network-drive.ps1` | Map persistent network drives | 2 min |
| `check-disk-health.ps1` | SMART status, disk errors, volume health | 3 min |
| `install-printer.ps1` | Add network printer by IP | 5 min |

### PIA / M365 Admin Scripts (`scripts/pia/`)

| Script | Use Case | Est. Time |
|--------|----------|-----------|
| `bulk-user-onboard.ps1` | New hire: AD account + groups + M365 | 15 min |
| `disable-user-offboard.ps1` | Departure: disable, strip groups, shared mailbox | 10 min |
| `export-mailbox-permissions.ps1` | Audit: Full Access, Send As, Send on Behalf | 5 min |
| `set-out-of-office.ps1` | Enable/schedule/disable auto-replies | 3 min |

### Running scripts directly

Each script has parameter documentation at the top. Examples:

```powershell
# Reset a user's password
.\reset-user-password.ps1 -Username jsmith -NewPassword "TempPass123!" -UnlockAccount -MustChangeAtLogon

# Clean disk space with all options
.\clear-disk-space.ps1 -IncludeWindowsUpdate -EmptyRecycleBin

# Offboard a departed employee
.\disable-user-offboard.ps1 -Username bjohnson -ForwardEmailTo "manager@company.com" -ConvertToSharedMailbox -SetOutOfOffice

# Install a network printer
.\install-printer.ps1 -PrinterName "HP 3rd Floor" -PrinterIP "192.168.1.50" -SetAsDefault
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Server status and config check |
| `/api/tickets` | GET | Fetch + analyze tickets from Autotask |
| `/api/analyze` | POST | Analyze tickets passed in request body |
| `/api/scripts` | GET | List all available scripts |
| `/api/scripts/:type/:file` | GET | Get a specific script's content |
| `/api/categories` | GET | List all ticket categories |
| `/api/queues` | GET | Fetch Autotask ticket queues |

## Project Structure

```
├── server.js                    # Express API server
├── src/
│   ├── autotask-client.js       # Autotask REST API client
│   ├── ticket-analyzer.js       # Ticket categorization + scoring
│   └── script-mapper.js         # Script file loader
├── scripts/
│   ├── datto/                   # 12 Datto RMM PowerShell scripts
│   └── pia/                     # 4 PIA/M365 admin scripts
└── public/
    ├── index.html               # Dashboard UI
    ├── style.css                # Dark theme styles
    └── app.js                   # Frontend logic
```
