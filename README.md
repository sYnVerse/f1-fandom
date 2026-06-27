# F1 Fandom Wiki Automator

A comprehensive automation tool for generating and maintaining Formula One Wiki tables on [f1.fandom.com](https://f1.fandom.com). This project combines **TypeScript** (Cloudflare Workers) and **Python** to create fully formatted WikiTables for Grand Prix articles.

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
- **Practice Session Automation**: Scrapes F1.com practice results (FP1, FP2, FP3) during active race weekends, updates the GP page practice results table incrementally, and retries automatically when results are not yet published.
- **Test Driver Entry List Updates**: Detects rookie test drivers appearing in FP1 who are not on the main entry list and appends them to the wiki Entry List section with team details from `TEAM_DETAILS_2026`.
- **Scheduled Stats Sync**: Automatically computes and synchronizes career stats templates once a race weekend's Grand Prix results are published.
- **Automated Infobox Updates**: Dynamically populates parameters in race infoboxes (`Infobox_Race` or `Infobox Sprint Race`) for qualifying pole, sprint standings, race winners, podium finishes, and fastest laps as sessions conclude.
- **LLM-Powered Section Reports**: Automatically drafts and publishes factual, neutral, encyclopedia-style reports for section headings (`Background`, `FP1`, `FP2`, `FP3`, `Q1`, `Q2`, `Q3`, `Sprint Report`, and `Race Report`) using an LLM. Practice reports crawl official F1.com session articles for richer context. Features native **Cloudflare Workers AI** (Llama 3) support with failover to **Google Gemini** or **OpenAI** APIs. Checks and safeguards sections to ensure human edits are never overwritten.
- **Per-Section KV Sync State**: Each GP page section, career template, and stats template has its own Cloudflare KV flag so one successful sync cannot block retries for another target.

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
- **Operational Warnings**: Alerts administrators about unknown test driver nationality flags and F1.com article crawler failures encountered during practice report generation.

### Data Processing
- **Smart Caching**: Caches per-round statistics and results in Cloudflare KV to minimize subrequests and stay within API rate limits. Within-run Jolpica API deduplication and 429 backoff reduce redundant fetches during cron execution.
- **Driver Name Mapping**: Map and standardize driver/constructor names and keys across different data sources (supporting lowercase key matching).
- **Time Calculations**: Calculate 107% qualifying times and convert time differentials to absolute times.
- **Flag and Constructor Templates**: Automated nationality-to-flag-template conversion for 25+ countries and constructor mapping.
- **2026 F1.com Race ID Resolution**: Dynamically resolves F1.com practice URL race IDs for the 2026 season (`1278 + round` for Rounds 1–3, `1280 + round` for Rounds 4–22).

### Python Utilities
- **Legacy Python Scripts**: Original Python-based wiki table generation with Pandas integration.
- **Ergast Data Handling**: Python wrapper for Ergast F1 API data processing.
- **Web Scraping**: BeautifulSoup integration for practice session data collection (aligned with TypeScript 2026 race ID formula).
- **Status Code Handling**: Proper handling of race status codes (Retired, Disqualified, DNS, etc.).

## Technology Stack

- **Backend**: TypeScript (Cloudflare Workers)
- **Data Sources**: Jolpi F1 API (Ergast-compatible), F1.com (practice results and session articles)
- **Wiki Integration**: MediaWiki API
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (tabs and real-time logs)
- **Python Tools**: Pandas, Requests, BeautifulSoup
- **Security**: Cloudflare Turnstile verification, CodeQL-safe line-based wikitext parsing
- **Storage**: Cloudflare KV (state tracking and logging)
- **Notifications**: Resend API (email reports)
- **AI**: Cloudflare Workers AI, Google Gemini Flash, OpenAI (with automatic provider fallback)

## Use Cases

- Automated wiki article updates after each F1 race weekend.
- Scheduled synchronization of news templates and season standings.
- Batch updates of driver career stats templates with cumulative season numbers.
- Automated practice results tables and FP session reports during race weekends.
- Automated monitoring and reporting of worker operations.
- Interactively previewing and deploying wikitext templates using a visual dashboard.

## Project Structure

```
f1-fandom/
├── src/
│   ├── index.ts              # Main Cloudflare Worker handler and cron sync
│   ├── f1-api.ts             # Jolpi API integration and F1.com helpers
│   ├── f1-api-cache.ts       # Within-run API deduplication and 429 backoff
│   ├── sync-kv.ts            # Per-target KV sync flag helpers
│   ├── wiki.ts               # MediaWiki API integration
│   ├── wikitext-generator.ts # WikiTable formatting and test driver helpers
│   ├── wikitext-parse.ts     # CodeQL-safe line-based wikitext parsing
│   ├── llm-reporter.ts       # LLM prompts, F1.com article crawling, HTML sanitization
│   ├── stats.ts              # Driver career statistics and template calculations
│   └── frontend-html.ts      # Web dashboard UI
├── scripts/
│   ├── verify-sync-kv.ts           # KV sync flag smoke tests
│   ├── verify-wikitext-parse.ts    # Wikitext parsing verification
│   ├── verify-infobox-update.ts    # Infobox parameter read/update tests
│   ├── verify-jolpica-cache.ts     # API cache dedup and backoff tests
│   ├── verify-practice-sessions.ts # Practice scraping and test driver tests
│   └── verify-llm-reporter.ts      # HTML sanitization and prompt context tests
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

### Running Tests

```bash
npm test
```

This runs the TypeScript compiler (`tsc --noEmit`) and all verification scripts in `scripts/`.

## Recent Updates & Changelog

Summary of improvements since the last README update (June 7, 2026):

### Practice Sessions & Test Drivers (June 2026)
- **Automated Practice Scraping**: Cron worker scrapes F1.com FP1/FP2/FP3 results during active race weekends and updates the GP page practice results table incrementally.
- **LLM Practice Reports**: Generates FP1, FP2, and FP3 section reports using crawled official F1.com session articles, with prompts highlighting incidents, spins, mechanical issues, and driver feedback.
- **Test Driver Entry List**: Detects test drivers in FP1 results and appends them to the wiki Entry List with team details; unknown nationalities default to `{{FIA}}` and trigger a daily email warning.
- **Empty Results Retry**: Skips KV sync when F1.com has not yet published results, allowing automatic retry on the next 10-minute cron execution.
- **2026 Race ID Formula**: Dynamic F1.com race ID resolution (`1278 + round` for Rounds 1–3, `1280 + round` for Rounds 4–22) in both TypeScript worker and Python CLI.
- **Sprint Weekend Support**: Practice results table shows FP1 only on sprint weekends.

### Sync Reliability & Performance (June 2026)
- **Per-Target KV Sync Flags** (`sync-kv.ts`): Replaced monolithic `gp_updated` flag with dedicated flags per GP page section, career template, stats template, and standings template — preventing one successful sync from blocking retries for another target.
- **Jolpica API Optimization**: Added within-run request deduplication, 429 backoff with `Retry-After`, round-level KV early-skip, and batched `fetchRoundJolpicaData` to reduce API calls during cron runs.
- **Events Sync Sanity Check**: Prevents `Template:Latest_F1_News/Events` from reverting to stale prior-season data when adjacent-year schedule fetches fail.

### Security & Code Quality (June 2026)
- **CodeQL ReDoS Fixes**: Replaced polynomial regex on wikitext with line-based parsing helpers in `wikitext-parse.ts`, `wiki.ts`, `stats.ts`, and `index.ts`.
- **HTML Sanitization**: Practice article text extraction uses loop-until-stable tag stripping with residual angle-bracket removal to prevent incomplete multi-character sanitization alerts.
- **ReDoS-Safe Entry List Matching**: Test driver entry list heading lookup uses `indexOf` instead of regular expressions on untrusted wikitext.

### Infobox & Wiki Robustness (June 2026)
- **Infobox Parameter Parsing**: Line-based infobox read/update prevents `}}}}` corruption when template values contain nested `}}` braces.
- **Infobox Cron Safeguard**: Skips overwriting infobox parameters that already have values, preserving human edits.
- **FIA Practice Classification URLs**: Updated practice results source ref URLs to match current FIA document naming.

### Earlier Improvements (also since last README update)
- **LLM-Powered Section Writing**: Factual wikitext reports for GP sections using Llama 3, Google Gemini Flash, or OpenAI with automatic fallback and human-edit safeguarding.
- **Dynamic Infobox Updating**: Pole times, podium finishers, nations, team templates, and fastest laps populated as sessions conclude.
- **Stats Cache Validation & Force-Refresh**: Only caches round stats after race results are confirmed; dashboard "Refresh Stats Cache" button clears stale KV keys.
- **StatsF1 Verification**: Classification cross-check against StatsF1 with mismatch highlighting in the dashboard.
- **Blank GP Page Generation**: API endpoint and dashboard button to generate clean wikitext drafts for upcoming GPs.
- **Constructor & Track Mapping**: São Paulo GP rename (2021+), Barcelona-Catalunya GP (2026), Revolut Audi and Cadillac team templates.
- **Dependabot**: Automated dependency update PRs configured via `.github/dependabot.yml`.

---

Built for Formula One Wiki enthusiasts and contributors.
