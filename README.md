# Autotask Ticket Analysis Tool

A web-based dashboard that connects to your Autotask PSA, pulls in your open tickets, and tells you which ones are quick wins (5-20 minutes) that can be knocked out fast with ready-made PowerShell scripts. Comes with 16 pre-built scripts for Datto RMM and M365 admin tasks.

---

## Table of Contents

1. [What You Need Before Starting](#what-you-need-before-starting)
2. [Step 1 - Install Node.js](#step-1---install-nodejs)
3. [Step 2 - Install Git](#step-2---install-git)
4. [Step 3 - Download This Project](#step-3---download-this-project)
5. [Step 4 - Install the Project Dependencies](#step-4---install-the-project-dependencies)
6. [Step 5 - Try It Out (Demo Mode)](#step-5---try-it-out-demo-mode)
7. [Step 6 - Connect to Your Autotask (Optional)](#step-6---connect-to-your-autotask-optional)
8. [How to Use the Dashboard](#how-to-use-the-dashboard)
9. [How to Use the PowerShell Scripts](#how-to-use-the-powershell-scripts)
10. [Script Reference](#script-reference)
11. [Troubleshooting](#troubleshooting)
12. [API Reference (Advanced)](#api-reference-advanced)
13. [Project Structure](#project-structure)

---

## What You Need Before Starting

You only need two free programs installed on your computer:

| Program | What It Is | Where to Get It |
|---------|-----------|-----------------|
| **Node.js** | A program that runs the server for this tool. Think of it like an engine that powers the dashboard. | https://nodejs.org |
| **Git** | A tool for downloading code from the internet. | https://git-scm.com |

**You do NOT need Autotask credentials to try this tool.** It has a built-in demo mode with sample tickets so you can see how everything works before connecting it to your real environment.

---

## Step 1 - Install Node.js

Node.js is what runs the tool's web server on your computer.

### Windows

1. Open your web browser and go to **https://nodejs.org**
2. You will see two big green download buttons. Click the one on the **left** that says **"LTS"** (Long Term Support). This is the stable version.
3. This downloads a file like `node-v20.x.x-x64.msi`. Double-click it to run the installer.
4. Click **Next** through each screen. Leave all the default options checked. You do not need to change anything.
5. On the "Tools for Native Modules" screen, you can **uncheck** the checkbox — you don't need it for this project.
6. Click **Install**, then **Finish**.

### Mac

1. Open your web browser and go to **https://nodejs.org**
2. Click the **LTS** download button on the left.
3. This downloads a `.pkg` file. Double-click it and follow the installer prompts.
4. Click **Continue** through each step, then **Install**.

### How to Verify It Worked

1. Open a terminal:
   - **Windows**: Press the `Windows` key, type `cmd`, and press Enter to open Command Prompt. (Or search for "PowerShell" and open that instead.)
   - **Mac**: Press `Cmd + Space`, type `Terminal`, and press Enter.
2. Type this command and press Enter:
   ```
   node --version
   ```
3. You should see a version number like `v20.11.0`. If you see that, Node.js is installed correctly.
4. Also check npm (Node's package manager — it installs automatically with Node.js):
   ```
   npm --version
   ```
5. You should see a version number like `10.2.4`. If you see that, you're good.

**If you get "not recognized" or "command not found"**: Close your terminal, reopen it, and try again. If it still doesn't work, restart your computer — the install needs a fresh terminal to take effect.

---

## Step 2 - Install Git

Git lets you download this project's code from the internet.

### Windows

1. Go to **https://git-scm.com**
2. Click the big **"Download for Windows"** button.
3. Run the downloaded `.exe` installer.
4. Click **Next** through every screen. **Leave all the defaults as-is.** There are a lot of screens with options — you don't need to change any of them. Just keep clicking Next.
5. Click **Install**, then **Finish**.

### Mac

Git may already be installed on your Mac. To check:
1. Open Terminal (`Cmd + Space`, type `Terminal`, press Enter).
2. Type `git --version` and press Enter.
3. If you see a version number, you already have it.
4. If not, your Mac will prompt you to install the Xcode Command Line Tools. Click **Install** when that popup appears and wait for it to finish.

### How to Verify It Worked

Open a terminal and type:
```
git --version
```
You should see something like `git version 2.43.0`. If you do, you're set.

---

## Step 3 - Download This Project

Now you'll download (or "clone") this project onto your computer.

1. Open a terminal (Command Prompt, PowerShell, or Terminal on Mac).

2. Navigate to where you want to put the project. For example, to put it on your Desktop:

   **Windows (Command Prompt):**
   ```
   cd %USERPROFILE%\Desktop
   ```

   **Windows (PowerShell):**
   ```
   cd $HOME\Desktop
   ```

   **Mac:**
   ```
   cd ~/Desktop
   ```

3. Download the project by typing this command (replace the URL with your actual repo URL):
   ```
   git clone <your-repo-url>
   ```

   **What this does:** It creates a new folder called `testing` on your Desktop containing all the project files.

4. Go into the project folder:
   ```
   cd testing
   ```

**Alternative if Git isn't working:** You can also download the project as a ZIP file from the repository page. Click the green **"Code"** button, then **"Download ZIP"**. Extract the ZIP file to your Desktop, then open a terminal and `cd` into the extracted folder.

---

## Step 4 - Install the Project Dependencies

The project needs a few extra packages (libraries) to run. npm will download them for you automatically.

1. Make sure your terminal is inside the project folder (you should have done `cd testing` in the previous step).

2. Run this command:
   ```
   npm install
   ```

3. **Wait for it to finish.** You'll see a progress bar and some text scrolling. This usually takes 15-60 seconds depending on your internet speed. It's downloading the packages the tool needs.

4. When it's done, you'll see something like:
   ```
   added 65 packages in 8s
   ```

   **Don't worry about "warn" messages.** Warnings are normal and won't affect anything. Only "ERR!" messages are real problems.

**What just happened:** npm looked at the `package.json` file (which lists what the project needs) and downloaded those packages into a new folder called `node_modules`. You don't need to touch that folder — it's managed automatically.

---

## Step 5 - Try It Out (Demo Mode)

You can now run the tool and see it working with sample data — no Autotask credentials needed.

1. Start the server:
   ```
   npm start
   ```

2. You should see this output:
   ```
   Autotask Analysis Tool running on http://localhost:3000
   Autotask API: Not configured (demo mode)
   ```

3. **Open your web browser** (Chrome, Edge, Firefox — any will work) and go to:
   ```
   http://localhost:3000
   ```

4. You'll see the dashboard. Click the **"Load Demo Tickets"** button.

5. The tool will analyze 18 sample MSP tickets and show you:
   - **Summary cards** at the top (total tickets, quick hitters, automatable count, estimated time saved)
   - **Category breakdown** showing how tickets are distributed
   - **Ticket cards** with color-coded automation scores and suggested scripts

6. Click any purple **script button** on a ticket card to see the PowerShell script. From there you can **Copy to Clipboard** or **Download** the `.ps1` file.

7. **To stop the server:** Go back to your terminal and press `Ctrl + C`.

---

## Step 6 - Connect to Your Autotask (Optional)

If you want to pull real tickets from your Autotask PSA, you need to set up API credentials. If you just want to use the demo and the script library, skip this step.

### 6a. Find Your Autotask API Zone

Your "zone" tells the tool which Autotask server to talk to. Look at the URL you use to log in to Autotask:

| If you log in at... | Your API zone is... |
|---------------------|---------------------|
| `https://ww1.autotask.net` | `https://webservices1.autotask.net` |
| `https://ww2.autotask.net` | `https://webservices2.autotask.net` |
| `https://ww5.autotask.net` | `https://webservices5.autotask.net` |
| `https://ww6.autotask.net` | `https://webservices6.autotask.net` |
| `https://ww8.autotask.net` | `https://webservices8.autotask.net` |
| `https://ww12.autotask.net` | `https://webservices12.autotask.net` |

Just match the number in your login URL to the webservices URL.

### 6b. Create an API User in Autotask

You need a special "API-only" user in Autotask. This is NOT a regular user account — it's specifically for software to connect to Autotask.

1. Log in to **Autotask** as an admin.
2. Go to **Admin** (the gear icon in the top right) > **Resources (Users)**.
3. Click **New** to create a new resource.
4. Fill in:
   - **First Name**: `API`
   - **Last Name**: `TicketAnalyzer` (or whatever you want to call it)
   - **Email**: Use a real email you have access to (needed for setup, but the user won't actually send email)
5. Under **Security Level**, select **"API User (System)"** or the appropriate API-level role.
6. Save the user.
7. Set a **password** for this API user (you'll use this as the API Secret).

### 6c. Get an Integration Code

1. In Autotask, go to **Admin** > **Extensions & Integrations** > **Other Extensions & Tools** > **REST API**.
2. Click **New Integration**.
3. Give it a name like `Ticket Analyzer`.
4. Copy the **Integration Code** that gets generated. You'll need this in the next step.

### 6d. Create Your .env File

1. Make sure the server is stopped (press `Ctrl + C` in the terminal if it's running).

2. In the project folder, you'll see a file called `.env.example`. You need to make a copy of it called `.env`:

   **Windows (Command Prompt):**
   ```
   copy .env.example .env
   ```

   **Windows (PowerShell):**
   ```
   Copy-Item .env.example .env
   ```

   **Mac:**
   ```
   cp .env.example .env
   ```

3. Open the new `.env` file in a text editor (Notepad, VS Code, whatever you have):

   **Windows:**
   ```
   notepad .env
   ```

   **Mac:**
   ```
   open -e .env
   ```

4. Fill in your credentials. The file looks like this — replace the placeholder values with your real ones:

   ```
   AUTOTASK_API_USER=api.ticketanalyzer@yourcompany.com
   AUTOTASK_API_SECRET=the-password-you-set-for-the-api-user
   AUTOTASK_API_INTEGRATION_CODE=the-code-from-step-6c
   AUTOTASK_API_ZONE=https://webservices6.autotask.net
   PORT=3000
   ```

5. Save the file and close the editor.

6. Start the server again:
   ```
   npm start
   ```

7. You should now see:
   ```
   Autotask Analysis Tool running on http://localhost:3000
   Autotask API: Configured
   ```

8. Open **http://localhost:3000** in your browser and click **"Fetch Tickets"** to pull your real tickets.

**Important:** The `.env` file contains your credentials. It is already listed in `.gitignore` so it will never be uploaded or shared. Keep it safe and don't share it.

---

## How to Use the Dashboard

### Summary Cards

When tickets are loaded, you'll see five stat cards at the top:

- **Total Tickets** - How many open tickets were analyzed
- **Quick Hitters** - Tickets estimated at 5-20 minutes (these are your money tickets)
- **Automatable** - Tickets with an automation score of 70% or higher
- **Est. Min Saved** - Total minutes you could save by using scripts instead of manual work
- **Avg Auto Score** - Average automation potential across all tickets

### Ticket Cards

Each ticket shows:

- **Green left border** = Quick hitter (5-20 min)
- **Blue "Category" badge** = What type of issue it is (Printer, Password Reset, etc.)
- **Green "Quick Hitter" badge** = Confirms this is a fast win
- **Yellow time badge** = Estimated minutes to resolve
- **Automation bar** = Visual score showing how automatable this ticket is
- **Purple script buttons** = Click these to see the PowerShell fix

### Filtering and Sorting

Use the dropdowns in the top right:

- **Filter: Quick Hitters Only** - Shows only the 5-20 minute tickets
- **Sort: Automation Score** - Puts the most automatable tickets first
- **Sort: Est. Time** - Puts the fastest tickets first
- **Sort: Confidence** - Puts the highest-confidence category matches first

### Script Viewer

When you click a script button, a popup appears with:

- The full PowerShell code
- **Copy to Clipboard** button - Copies the script so you can paste it into Datto RMM, a PowerShell window, or any remote session
- **Download .ps1** button - Saves it as a file you can upload to your Datto RMM component library

### Script Library

Click **"Browse All Scripts"** to see every script available, organized by type (Datto RMM vs PIA/M365). Click any card to view it.

---

## How to Use the PowerShell Scripts

### Option A: Copy from the Dashboard and Run in Datto RMM

1. Click a script button on a ticket card.
2. Click **"Copy to Clipboard"**.
3. In **Datto RMM**, create a new Component (or open an existing one).
4. Paste the script into the component.
5. Set the **script type** to PowerShell.
6. Adjust the parameters at the top of the script to match your environment.
7. Run the component against the target device.

### Option B: Download and Run Directly via Remote Session

1. Click a script button, then click **"Download .ps1"**.
2. Connect to the target machine (via Datto RMM remote, ScreenConnect, RDP, etc.).
3. Open **PowerShell as Administrator** on the target machine.
4. Navigate to where you saved the file and run it:
   ```powershell
   .\clear-print-spooler.ps1
   ```

### Option C: Run from the Scripts Folder Directly

All scripts are in the `scripts/` folder of this project. You can browse them, copy them, or run them however you prefer:

```
scripts/
  datto/          <-- Scripts for running on endpoints via Datto RMM
  pia/            <-- Scripts for M365/Exchange admin tasks (run from your admin workstation)
```

### Script Parameters

Every script has parameters you can customize. They're listed at the top of each script. Here are common examples:

```powershell
# Reset a password and force change at next login
.\reset-user-password.ps1 -Username "jsmith" -NewPassword "Welcome2024!" -UnlockAccount -MustChangeAtLogon

# Clean disk space including Windows Update cache and Recycle Bin
.\clear-disk-space.ps1 -IncludeWindowsUpdate -EmptyRecycleBin

# Flush DNS and do a full network stack reset (requires reboot after)
.\flush-dns-reset-network.ps1 -FullReset

# Clear Teams cache for a specific user and restart Teams after
.\clear-teams-cache.ps1 -TargetUser "jsmith" -RestartTeams

# Install a network printer
.\install-printer.ps1 -PrinterName "HP 3rd Floor Accounting" -PrinterIP "192.168.1.50" -SetAsDefault

# Onboard a new hire
.\bulk-user-onboard.ps1 -FirstName "Jane" -LastName "Doe" -Department "Marketing" -JobTitle "Coordinator" -SecurityGroups @("Marketing-Team", "All-Staff") -CreateMailbox

# Offboard a departed employee
.\disable-user-offboard.ps1 -Username "bjohnson" -ForwardEmailTo "manager@company.com" -ConvertToSharedMailbox -SetOutOfOffice

# Set out of office with a schedule
.\set-out-of-office.ps1 -UserEmail "ceo@company.com" -Action Scheduled -StartDate "2024-12-23" -EndDate "2025-01-02"

# Export mailbox permissions for an audit
.\export-mailbox-permissions.ps1 -AllMailboxes
```

---

## Script Reference

### Datto RMM Scripts (run on endpoints)

These scripts are meant to run on the target computer, either through Datto RMM components or a remote PowerShell session.

| Script | What It Fixes | How Long | Parameters |
|--------|--------------|----------|------------|
| `clear-print-spooler.ps1` | Stuck print jobs, frozen print queue | 2 min | `-Force` |
| `reset-user-password.ps1` | Locked accounts, expired passwords | 2 min | `-Username`, `-NewPassword`, `-UnlockAccount`, `-MustChangeAtLogon` |
| `clear-disk-space.ps1` | Low disk space warnings | 5 min | `-IncludeWindowsUpdate`, `-EmptyRecycleBin` |
| `restart-service.ps1` | Stopped or hung Windows services | 2 min | `-ServiceName`, `-TimeoutSeconds`, `-ForceKill` |
| `flush-dns-reset-network.ps1` | DNS issues, DHCP problems, no internet | 3 min | `-FullReset`, `-SkipDHCPRenew` |
| `force-group-policy-update.ps1` | GPO not applying, missing drive maps | 3 min | (no parameters needed) |
| `clear-teams-cache.ps1` | Teams blank screen, crashes, slowness | 3 min | `-RestartTeams`, `-TargetUser` |
| `clear-outlook-cache.ps1` | Outlook crashes, sync issues | 5 min | `-RebuildOST`, `-TargetUser` |
| `repair-office-apps.ps1` | Office crashes, activation failures | 10 min | `-RepairType Quick` or `-RepairType Online` |
| `map-network-drive.ps1` | Missing or broken drive mappings | 2 min | `-DriveLetter`, `-UNCPath`, `-Persistent` |
| `check-disk-health.ps1` | SMART warnings, disk errors | 3 min | (no parameters needed) |
| `install-printer.ps1` | Adding a new network printer | 5 min | `-PrinterName`, `-PrinterIP`, `-DriverName`, `-SetAsDefault` |

### PIA / M365 Admin Scripts (run from admin workstation)

These scripts connect to Active Directory and/or Microsoft 365. Run them from a computer that has the required PowerShell modules installed (ActiveDirectory, ExchangeOnlineManagement).

| Script | What It Does | How Long | Parameters |
|--------|-------------|----------|------------|
| `bulk-user-onboard.ps1` | Creates AD account, adds to groups, preps M365 | 15 min | `-FirstName`, `-LastName`, `-Department`, `-SecurityGroups`, `-CreateMailbox` |
| `disable-user-offboard.ps1` | Disables account, strips access, shared mailbox | 10 min | `-Username`, `-ForwardEmailTo`, `-ConvertToSharedMailbox`, `-SetOutOfOffice` |
| `export-mailbox-permissions.ps1` | Exports Full Access, Send As, Send on Behalf to CSV | 5 min | `-UserEmail` or `-AllMailboxes` |
| `set-out-of-office.ps1` | Sets/schedules/disables auto-reply | 3 min | `-UserEmail`, `-Action`, `-StartDate`, `-EndDate` |

---

## Troubleshooting

### "node is not recognized" or "npm is not recognized"

Node.js isn't installed or your terminal doesn't know about it yet.
- Close ALL terminal windows and open a new one, then try again.
- If that doesn't work, restart your computer.
- If it still doesn't work, reinstall Node.js from https://nodejs.org and make sure you leave all installer defaults checked.

### "git is not recognized"

Same as above but for Git. Close terminal, reopen, try again. If needed, restart your computer or reinstall Git from https://git-scm.com.

### npm install shows errors

- Make sure you're inside the project folder (you should see `package.json` when you type `dir` on Windows or `ls` on Mac).
- Make sure you have an internet connection.
- Try running it again — sometimes the first attempt fails due to a network hiccup.

### The browser shows "This site can't be reached" or "localhost refused to connect"

- Make sure the server is still running in your terminal. You should see `Autotask Analysis Tool running on http://localhost:3000`. If you don't, run `npm start` again.
- Make sure you're going to `http://localhost:3000` (with **http**, not https).
- Make sure you're using port 3000 (or whatever port you set in `.env`).

### "Fetch Tickets" gives an error

- Double-check all four values in your `.env` file. Even one wrong character will cause it to fail.
- Make sure your API user is enabled and has the right security level in Autotask.
- Make sure the zone URL matches your login URL (see the zone table above).
- Use **"Load Demo Tickets"** to verify the tool itself is working — if demo works, the issue is with credentials.

### PowerShell script says "Access Denied" or "not recognized as a cmdlet"

- Most Datto scripts need to be run **as Administrator**. Right-click PowerShell and choose "Run as Administrator".
- The PIA scripts need specific PowerShell modules. Install them:
  ```powershell
  Install-Module -Name ActiveDirectory
  Install-Module -Name ExchangeOnlineManagement
  Install-Module -Name Microsoft.Graph
  ```

### How to change the port

Edit the `PORT` value in your `.env` file. For example, to use port 8080:
```
PORT=8080
```
Then restart the server (`Ctrl + C`, then `npm start`) and go to `http://localhost:8080`.

---

## API Reference (Advanced)

If you want to integrate this tool with other systems, here are the available API endpoints:

| Endpoint | Method | What It Does |
|----------|--------|-------------|
| `/api/status` | GET | Returns whether Autotask is configured and lists available scripts |
| `/api/tickets` | GET | Fetches tickets from Autotask and returns analyzed results |
| `/api/analyze` | POST | Analyzes tickets you send in the request body (for custom integrations) |
| `/api/scripts` | GET | Lists all available PowerShell scripts |
| `/api/scripts/:type/:file` | GET | Returns the content of a specific script |
| `/api/categories` | GET | Lists all 14 ticket categories with their automation scores |
| `/api/queues` | GET | Returns Autotask ticket queues for filtering |

---

## Project Structure

```
testing/
├── server.js                    # The web server (runs on Node.js)
├── package.json                 # Lists the project's dependencies
├── .env.example                 # Template for your API credentials
├── .env                         # Your actual credentials (you create this, never shared)
├── .gitignore                   # Tells Git to ignore .env and node_modules
├── src/
│   ├── autotask-client.js       # Talks to the Autotask API
│   ├── ticket-analyzer.js       # Categorizes tickets and scores them
│   └── script-mapper.js         # Loads PowerShell scripts from disk
├── scripts/
│   ├── datto/                   # 12 PowerShell scripts for Datto RMM
│   │   ├── clear-print-spooler.ps1
│   │   ├── reset-user-password.ps1
│   │   ├── clear-disk-space.ps1
│   │   ├── restart-service.ps1
│   │   ├── flush-dns-reset-network.ps1
│   │   ├── force-group-policy-update.ps1
│   │   ├── clear-teams-cache.ps1
│   │   ├── clear-outlook-cache.ps1
│   │   ├── repair-office-apps.ps1
│   │   ├── map-network-drive.ps1
│   │   ├── check-disk-health.ps1
│   │   └── install-printer.ps1
│   └── pia/                     # 4 PowerShell scripts for M365 admin
│       ├── bulk-user-onboard.ps1
│       ├── disable-user-offboard.ps1
│       ├── export-mailbox-permissions.ps1
│       └── set-out-of-office.ps1
└── public/
    ├── index.html               # The dashboard webpage
    ├── style.css                # Visual styling (dark theme)
    └── app.js                   # Dashboard interactivity
```
