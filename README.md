# F1 Fandom Wiki Automator

A comprehensive automation tool for generating and maintaining Formula One Wiki tables on [f1.fandom.com](https://f1.fandom.com). This project combines **TypeScript** (55.5%) and **Python** (44.5%) to create fully formatted WikiTables for Grand Prix articles.

## Features

### Core Functionality
- **Wiki API Integration**: Authenticate with MediaWiki accounts using bot passwords and manage wiki sessions securely.
- **F1 Data Fetching**: Retrieve real-time Formula One data from the Ergast-compatible Jolpi API including:
  - Season schedules and race calendars
  - Race results and finishing positions
  - Qualifying session results with Q1, Q2, Q3 times
  - Practice session data (FP1, FP2, FP3)
  - Driver and Constructor standings
  - Sprint race results

### Automated Syncing & Background Tasks (Cron Workers)
- **Latest News & Events Sync**: Periodically compiles the previous, latest, and upcoming event schedules and updates `Template:Latest_F1_News/Events`.
- **Career Standing Templates Sync**: Automatically keeps the F1 Fandom career standing templates (`Template:Career_Results/Points/2026`, `Template:Career_Results/Position/2026`, and `Template:Career_Results/Team_Position/2026`) synchronized with the latest standings from the Jolpi API.
- **Concluded Sessions Polling**: Automatically checks KV caches and conclusion status for completed Grand Prix and Sprint sessions, polling results and deploying them to wiki templates as soon as they become available.
- **Scheduled Stats Sync**: Automatically computes and synchronizes career stats templates once a race weekend's Grand Prix results are published.
- **Automated Infobox Updates**: Dynamically populates parameters in race infoboxes (`Infobox_Race` or `Infobox Sprint Race`) for qualifying pole, sprint standings, race winners, podium finishes, and fastest laps as sessions conclude.
- **LLM-Powered Section Reports**: Automatically drafts and publishes factual, neutral, encyclopedia-style reports for section headings (`Background`, `Q1`, `Q2`, `Q3`, `Sprint Report`, and `Race Report`) using an LLM. Features native **Cloudflare Workers AI** (Llama 3) support with failover to **Google Gemini** or **OpenAI** APIs. Checks and safeguards sections to ensure human edits are never overwritten.

### Wiki Career Stats Tracking
- **Cumulative Stat Compilations**: Combines 2025 career baseline data with 2026 round-by-round statistics to track cumulative progress.
- **Supports 21 Career Stats Templates**: Auto-generates wikitext for templates under `Category:Subtemplates of Template:Stats` (e.g. Championships, Distance, DistanceLed, Doubles, Entries, FastestLaps, FrontRows, Grand Chelems, HatTricks, Laps, LapsLed, Podiums, Points, Poles, RacesLed, SprintFastestLaps, SprintPodiums, SprintPoles, SprintWins, Starts, Wins).
- **Automated Last Correction Text**: Appends and updates correction comments at the bottom of templates to track which race the stats are corrected to.

### Web Dashboard & API Endpoints
- **Modern Frontend Dashboard**: Responsive F1-themed dark dashboard with interactive tabs.
- **Interactive Wiki Stats Panel**: Features dedicated controls to preview stats updates round-by-round and deploy specific templates to the wiki with real-time logging.
- **Bot Connection Test & Publishing**: Validate bot credentials, fetch page content, and edit specific page sections directly from the UI.
- **Security & Turnstile Integration**: Protects write operations with Cloudflare Turnstile CAPTCHA (with automatic bypass for local development or when `TURNSTILE_SECRET_KEY` is not configured).

### Daily Reporting
- **Operations Summary Emails**: Integrates with Resend API to deliver a daily report (at 6 AM Pacific Time) to administrators detailing total attempted, succeeded, and failed API actions, including a detailed error log with reasons for any failures.

### Data Processing
- **Smart Caching**: Caches per-round statistics and results in Cloudflare KV to minimize subrequests and stay within API rate limits.
- **Driver Name Mapping**: Map and standardize driver/constructor names and keys across different data sources (supporting lowercase key matching).
- **Time Calculations**: Calculate 107% qualifying times and convert time differentials to absolute times.
- **Flag and Constructor Templates**: Automated nationality-to-flag-template conversion for 25+ countries and constructor mapping.

### Python Utilities
- **Legacy Python Scripts**: Original Python-based wiki table generation with Pandas integration.
- **Ergast Data Handling**: Python wrapper for Ergast F1 API data processing.
- **Web Scraping**: BeautifulSoup integration for practice session data collection.
- **Status Code Handling**: Proper handling of race status codes (Retired, Disqualified, DNS, etc.).

## Technology Stack

- **Backend**: TypeScript (Cloudflare Workers)
- **Data Sources**: Jolpi F1 API (Ergast-compatible)
- **Wiki Integration**: MediaWiki API
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (tabs and real-time logs)
- **Python Tools**: Pandas, Requests, BeautifulSoup
- **Security**: Cloudflare Turnstile verification
- **Storage**: Cloudflare KV (state tracking and logging)
- **Notifications**: Resend API (email reports)

## Use Cases

- Automated wiki article updates after each F1 race weekend.
- Scheduled synchronization of news templates and season standings.
- Batch updates of driver career stats templates with cumulative season numbers.
- Automated monitoring and reporting of worker operations.
- Interactively previewing and deploying wikitext templates using a visual dashboard.

## Project Structure

```
f1-fandom/
├── src/
│   ├── index.ts              # Main Cloudflare Worker handler
│   ├── f1-api.ts             # Ergast/Jolpi API integration
│   ├── wiki.ts               # MediaWiki API integration
│   ├── wikitext-generator.ts # WikiTable formatting
│   ├── stats.ts              # Driver career statistics and templates calculations
│   └── frontend-html.ts      # Web dashboard UI
├── f1.py                     # Python wiki table generator
├── pyergast.py               # Python Ergast API wrapper
└── README.md
```

## Getting Started

1. Set up wiki authentication credentials (bot account on f1.fandom.com)
2. Configure environment variables for wiki domain, bot password, and LLM configuration (`GEMINI_API_KEY`, `OPENAI_API_KEY`, or `LLM_PROVIDER`)
3. Deploy Cloudflare Worker to enable automated table and report generation
4. Use the web dashboard or API endpoints to trigger updates
5. Verify generated wikitext before publishing to wiki

## Recent Updates & Changelog

Here is a summary of the improvements and fixes made in recent commits:

### Automated Reporting & Content Generation
- **LLM-Powered Section Writing**: Added support for generating factual, neutral wikitext reports for GP sections (`Background`, `Q1`, `Q2`, `Q3`, `Sprint Report`, `Race Report`) using Llama 3, Google Gemini, or OpenAI with automatic fallback checks and custom edit safeguarding.
- **Dynamic Infobox Updating**: Automatically updates pole times, podium finishers, nations, team templates, and fastest laps inside the GP article's infobox.

### Stats, Standings & Caching Improvements
- **Stats Cache Validation & Force-Refresh**: Added stats cache validation logic so cached rounds are only saved after race results are confirmed (preventing premature caching of qualifying data). Added a "Refresh Stats Cache" button to clear KV round keys and recompute.
- **Fallback Grid Positions**: Improved race result parsing by automatically falling back to qualifying positions if grid values from the API are missing/null.
- **Dynamic Points Formatting**: Implemented dynamic rowspans for points blanks, hiding "0" points and resolving table layout colspan issues.
- **StatsF1 Verification**: Added verification steps to check classification results against StatsF1 and highlight mismatches in the dashboard.

### Wiki Integration & Robustness
- **Failsafe Heading Replacement**: Refactored heading detection and section replacement logic to support flexible, fuzzy spacing and levels in wikitext headings.
- **Blank GP Page Generation**: Added worker API endpoint and frontend dashboard button to generate a clean wikitext draft for upcoming GP pages.
- **Constructor & Track Mapping Refinements**:
  - Mapped 'Brazilian Grand Prix' to 'São Paulo Grand Prix' (from 2021 onwards) to match wiki page titles.
  - Mapped 'Barcelona Grand Prix' to 'Barcelona-Catalunya Grand Prix' (for the 2026 season).
  - Updated constructors to support Revolut Audi F1 Team and Cadillac Formula 1 Team templates.
- **CAPTCHA Stability**: Fixed Turnstile verification issues in frontend forms by adding resets in finally blocks.

---

Built for Formula One Wiki enthusiasts and contributors.
