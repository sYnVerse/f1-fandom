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
- **Latest Data Template Sync**: After each Grand Prix race concludes and final results are published, updates `Template:Latest_Data` (`number` = season round, `gp` = latest completed GP link, `gpnumber` incremented by 1 per completed round).
- **Career Standing Templates Sync**: Automatically keeps the F1 Fandom career standing templates (`Template:Career_Results/Points/2026`, `Template:Career_Results/Position/2026`, and `Template:Career_Results/Team_Position/2026`) synchronized with round-verified standings from the Jolpi API, with ownership strictly gated to the latest concluded round to prevent multi-round flip-flops.
- **Concluded Sessions Polling**: Automatically checks KV caches and conclusion status for completed Grand Prix and Sprint sessions, polling results and deploying them to wiki templates as soon as they become available.
- **Sprint Qualifying Automation**: Fetches Sprint Qualifying session classifications from the OpenF1 API, resolves driver numbers to current season constructors, and updates the GP page's Sprint Qualifying Results section with a formatted wikitext table.
- **Practice Session Automation**: Scrapes F1.com practice results (FP1, FP2, FP3) during active race weekends, updates the GP page practice results table incrementally, strips glued driver TLAs, and protects healthy tables against degraded scrapes.
- **Entry List Synchronization & Test Drivers**: Automatically updates and maintains the Grand Prix page's main Entry List table using FIA Entry List PDF data, detects rookie/test drivers appearing in FP1, caches driver flags/teams in KV, canonicalizes special character names (e.g., Ryō Hirakawa), and appends them to a dedicated "Test Drivers for Practice 1" subsection.
- **Career Results Test Driver {{TD}} Rows**: Appends missing `|Name = {{TD}}` rows to `Template:Career_Results/{year} {race}` when test drivers participate in FP1, preserving existing `{{TD}}` rows during race results writes.
- **Scheduled Stats Sync**: Automatically computes and synchronizes career stats templates once a race weekend's Grand Prix results are published.
- **Automated Infobox Updates**: Dynamically populates parameters in race infoboxes (`Infobox_Race` or `Infobox Sprint Race`) for qualifying pole, sprint standings, race winners, podium finishes, and fastest laps as sessions conclude.
- **LLM-Powered Section Reports**: Automatically drafts and publishes factual, neutral, encyclopedia-style reports for section headings (`Background`, `FP1`, `FP2`, `FP3`, `Q1`, `Q2`, `Q3`, `Sprint Report`, and `Race Report`) using an LLM. Practice reports crawl official F1.com session articles for richer context. Features native **Cloudflare Workers AI** (Llama 3) support with failover to **Google Gemini** or **OpenAI** APIs. Checks and safeguards sections to ensure human edits are never overwritten.
- **Per-Section KV Sync State & Edit Replay**: Each GP page section, career template, and stats template has its own Cloudflare KV flag so one successful sync cannot block retries for another target. Defers KV sync marking until MediaWiki API edits succeed, with automatic 10s edit retries and KV replay queuing for failed edits.

### Wiki Career Stats Tracking
- **Cumulative Stat Compilations**: Combines 2025 career baseline data with 2026 round-by-round statistics to track cumulative progress.
- **Supports 21 Career Stats Templates**: Auto-generates wikitext for templates under `Category:Subtemplates of Template:Stats` (e.g. Championships, Distance, DistanceLed, Doubles, Entries, FastestLaps, FrontRows, Grand Chelems, HatTricks, Laps, LapsLed, Podiums, Points, Poles, RacesLed, SprintFastestLaps, SprintPodiums, SprintPoles, SprintWins, Starts, Wins).
- **Automated Last Correction Text**: Appends and updates correction comments at the bottom of templates to track which race the stats are corrected to.

### Web Dashboard & API Endpoints
- **Modern Frontend Dashboard**: Responsive F1-themed dark dashboard with interactive tabs.
- **Interactive Wiki Stats Panel**: Features dedicated controls to preview stats updates round-by-round and deploy specific templates to the wiki with real-time logging.
- **Bot Connection Test & Publishing**: Validate bot credentials, fetch page content, and edit specific page sections directly from the UI. Dashboard publishes are limited to allowlisted wiki hosts and page titles (GP pages, Career/Stats/Latest templates, and `User:…/Sandbox` drafts).
- **Security & Turnstile Integration**: Protects write operations with Cloudflare Turnstile CAPTCHA (with automatic bypass for local development or when `TURNSTILE_SECRET_KEY` is not configured). Optional `DASHBOARD_OWNER_TOKEN` adds an extra shared-secret gate for publish APIs.
- **Credential Storage**: Bot password and optional owner token are kept in `sessionStorage` only (cleared when the tab closes); domain/username/sandbox settings may persist in `localStorage`.

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
- **Security**: Cloudflare Turnstile verification; wiki-domain and F1.com URL allowlists; dashboard publish title/credential guards; wikitext field sanitization; CodeQL-safe line-based wikitext parsing
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
│   ├── index.ts                     # Main Cloudflare Worker handler and cron sync
│   ├── career-results-stint.ts      # Stint-aware Career Results row sync helpers
│   ├── career-standings-owner.ts    # Latest concluded round ownership helper for career standings
│   ├── f1-api.ts                    # Jolpi API integration, Ergast fallbacks, and F1.com helpers
│   ├── f1-api-cache.ts              # Within-run API deduplication and 429 backoff
│   ├── fia-pdf-parser.ts            # FIA Entry List PDF parsing for test and race drivers
│   ├── sync-kv.ts                   # Per-target KV sync flag helpers
│   ├── kv-ops.ts                    # KV daily write count, log buffering, edit retry/replay, and failure locks
│   ├── llm-reporter.ts              # LLM prompts, F1.com article crawling, HTML sanitization
│   ├── publish-guard.ts             # Dashboard publish title/credential/rate-limit guards
│   ├── season-roster-2026.ts        # Shared 2026 driver-to-constructor roster map
│   ├── stats.ts                     # Driver career statistics and template calculations
│   ├── statsf1.ts                   # StatsF1 classification verification helper
│   ├── team-drivers-registry.ts     # Template:Team Drivers/{year} stint registry parser
│   ├── url-allowlist.ts             # Strict https host/URL allowlisting helpers
│   ├── wiki.ts                      # MediaWiki API integration, domain allowlist, and edit retries
│   ├── wikitext-generator.ts        # WikiTable formatting and test driver helpers
│   ├── wikitext-parse.ts            # CodeQL-safe line-based wikitext parsing
│   ├── wikitext-sanitize.ts         # Sanitize API strings before wikitext interpolation
│   └── frontend-html.ts             # Web dashboard UI
├── scripts/
│   ├── verify-sync-kv.ts            # KV sync flag smoke tests
│   ├── verify-career-standings-owner.ts # Multi-round career standings ownership tests
│   ├── verify-career-stint.ts       # Career Results stint-aware sync tests
│   ├── verify-wikitext-parse.ts     # Wikitext parsing verification
│   ├── verify-infobox-update.ts     # Infobox parameter read/update tests
│   ├── verify-jolpica-cache.ts      # API cache dedup, backoff, and bulk endpoint tests
│   ├── verify-practice-sessions.ts  # Practice scraping and test driver tests
│   ├── verify-openf1-sync.ts        # OpenF1 Sprint Qualifying sync and wikitext tests
│   ├── verify-latest-data.ts        # Template:Latest_Data parse/increment tests
│   ├── verify-llm-reporter.ts       # HTML sanitization and prompt context tests
│   ├── verify-entry-list-sync.ts    # Entry list table sync and PDF parser tests
│   ├── verify-fia-pdf-parser.ts     # FIA Entry List PDF parser verification
│   ├── verify-kv-ops.ts             # KV daily write count and edit failure lock tests
│   ├── verify-wiki-edit-retry.ts    # Edit retry and KV replay queue verification
│   ├── verify-wiki-domain-allowlist.ts # Wiki domain SSRF allowlist tests
│   ├── verify-security-hardening.ts # Publish/practice URL/sanitize hardening tests
│   ├── verify-career-placeholder.ts # Career Results placeholder row tests
│   ├── verify-legacy-kv.ts          # Legacy KV state fallback tests
│   └── verify-stats-sync.ts         # Career stats template calculations verification
├── f1.py                            # Python wiki table generator
├── pyergast.py                      # Python Ergast API wrapper
├── wrangler.toml                    # Cloudflare Worker name, crons, KV, public vars
└── README.md
```

## Getting Started

1. Set up wiki authentication credentials (bot account on f1.fandom.com with a bot password).
2. Configure Cloudflare Worker secrets and vars (see below).
3. Deploy the Worker (`npm run deploy` / `wrangler deploy`) to enable cron sync and the dashboard.
4. Use the web dashboard or API endpoints to preview and publish updates.
5. Verify generated wikitext before publishing to the wiki.

### Configuration (vars & secrets)

Public vars (also settable in `wrangler.toml` `[vars]`):

| Name | Purpose |
|------|---------|
| `DEFAULT_WIKI_DOMAIN` | Default wiki host (default `f1.fandom.com`) |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key for the dashboard |
| `STATS_SYNC` | Set to `TRUE` to enable cron updates of the 21 career Stats templates |
| `ALLOWED_WIKI_HOSTS` | Optional comma-separated extra allowlisted wiki hostnames |
| `LLM_PROVIDER` | Optional preferred LLM (`gemini`, `openai`, or `workers-ai`) |

Secrets (via Cloudflare dashboard or `wrangler secret put` — never commit values):

| Name | Purpose |
|------|---------|
| `WIKI_BOT_USERNAME` | MediaWiki bot account used by cron and (when set) dashboard publish binding |
| `WIKI_BOT_PASSWORD` | Bot password for that account |
| `TURNSTILE_SECRET_KEY` | Turnstile server-side verification secret |
| `DASHBOARD_OWNER_TOKEN` | Optional shared secret required on `/api/publish` and `/api/publish-stats` |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | Optional LLM provider keys (Workers AI is used when neither is set) |
| `RESEND_API_KEY` | Optional; enables daily operations summary email |
| `JOLPICA_API_KEY` | Optional Jolpi/Jolpica API bearer token |
| `WIKI_API_ENDPOINT` / `PROXY_SECRET` | Optional MediaWiki API proxy URL and shared proxy header |

Cron triggers (see `wrangler.toml`): `*/21 * * * *` (high-frequency race-weekend polling) and `0 * * * *` (hourly). Bind KV namespace `F1_WIKI_STATE` and the Workers AI binding as configured in `wrangler.toml`.

### Running Tests

```bash
npm test
```

This runs the TypeScript compiler (`tsc --noEmit`) and the verification scripts wired in `package.json` `test`. Additional security suites can be run directly:

```bash
npx tsx scripts/verify-wiki-domain-allowlist.ts
npx tsx scripts/verify-security-hardening.ts
```

## Recent Updates & Changelog

Summary of improvements (updated October 20, 2026):

### Security Hardening (October 2026)
- **Wiki Domain Allowlist (SSRF)**: `/api/wiki-status` and `/api/wiki-content` accept only allowlisted hosts (default `f1.fandom.com`, plus `DEFAULT_WIKI_DOMAIN` / `ALLOWED_WIKI_HOSTS`) with strict https-only parsing; same-host redirect following on wiki page fetches.
- **Dashboard Publish Guards**: `/api/publish` and `/api/publish-stats` enforce wiki host allowlisting, allowlisted page titles, wikitext size limits, per-IP rate limiting, Turnstile, optional `DASHBOARD_OWNER_TOKEN`, and credential binding to `WIKI_BOT_USERNAME` / `WIKI_BOT_PASSWORD` when those secrets are configured.
- **Practice URL Allowlist**: Client-supplied practice scrape URLs must be `https://www.formula1.com/en/results/.../practice/...`.
- **OpenF1 Fetch Allowlist**: OpenF1 JSON fetches are restricted to `api.openf1.org` with path traversal rejection.
- **Wikitext Field Sanitization**: API-derived names, numbers, times, and constructor fallbacks are sanitized before interpolation into generated wikitext.
- **Session Credential Storage**: Dashboard bot password (and optional owner token) use `sessionStorage`; non-secret settings may remain in `localStorage`.

### F1.com Glued TLA Stripping & Practice Table Protection (July 2026)
- **Semi-Automated Edit Summaries**: All edit summaries triggered from the front-end dashboard now use `"Semi-automated edit..."` instead of `"automated update"`.
- **Glued TLA Normalization**: Strips trailing 3-letter driver TLAs (e.g. `Paul AronARO`) produced when falling back to F1.com scrapes during OpenF1 429 errors, ensuring accurate nationality flag mapping and KV cache lookups.
- **Test Driver Constructor Templates**: Formats test driver team templates consistently with race drivers using `getTeamTemplate`.
- **Practice Table Degradation Safeguard**: Prevents overwriting an already healthy Practice Results table when a regenerated or fallback scrape yields incomplete or degraded data.
- **30-Day OpenF1 Session Cache**: Extended `session_result` OpenF1 KV cache TTL from 1 day to 30 days to reduce upstream API load.

### Wiki Edit Retries & KV Replay Queue (July 2026)
- **Deferred KV Sync Marking**: Defers setting KV section/template sync flags until MediaWiki API returns an explicitly successful edit (`result === 'Success'`).
- **10s Retry & KV Replay Queue**: Automatically retries failed wiki edits after 10 seconds. On persistent failure, saves the generated edit payload to KV for instant replay on the next cron execution without re-fetching APIs or calling LLMs.
- **Empty Report Regeneration**: Automatically detects and regenerates section report headings that were marked as synced in KV but left empty on the wiki.

### Career Standings & Results Synchronization Reliability (July 2026)
- **Single-Pass Standings Sync**: Fixed hourly template flip-flops across `Points`, `Position`, and `Team_Position` by updating Career standings in the same pass as race results and restricting standings ownership strictly to the latest concluded round.
- **Career Results Test Driver {{TD}} Rows**: Appends missing `|Name = {{TD}}` rows to `Template:Career_Results/{year} {race}` when test drivers participate in FP1, preserving existing `{{TD}}` rows during post-race results writes.
- **Template:Latest_Data Auto-Sync**: Cron worker automatically updates `Template:Latest_Data` (`number`, `gp`, `gpnumber`) after each completed Grand Prix.
- **Stale Standings Cache Invalidation**: Invalidates stale season standings KV cache immediately when new race results arrive.

### Entry List & Practice Session Test-Driver Consistency (July 2026)
- **Test-Driver Entry KV Caching**: Caches resolved `TestDriverEntry` rows (names, flags, constructor teams) in KV per round during Entry List sync, ensuring practice tables reuse accurate driver details instead of defaulting to `{{FIA}}`.
- **Canonical Wiki Name Matching**: Automatically canonicalizes test driver special characters (e.g. converting ASCII `Ryo Hirakawa` to `Ryō Hirakawa`) to match Fandom article titles.
- **Entry-List Flip-Flop Prevention**: Prioritizes FIA Entry List PDF documents (then FP1 participants) over Jolpica previous-round fallbacks to prevent junior driver leakage onto active GP entry lists.

### Jolpica Call Volume & Bulk Endpoints Optimization (July 2026)
- **Bulk Endpoints & Grid Derivation**: Eliminated $N \times$ `/drivers/{id}/constructors.json` endpoint calls and prior-round driver walks by deriving driver grids directly from already-fetched season standings, results, and qualifying payloads.

### Provisional Qualifying & Standings Repair (July 2026)
- **Provisional / Order-Only Qualifying Recovery**: Detects order-only qualifying payloads (missing Q1/Q2/Q3 lap times), marks them as incomplete with a short TTL, falls back to OpenF1, and maintains a 48h race weekend repair window so blank pages auto-recover once session times publish.
- **Constructor Fallback & Race Result Prerequisite**: Rejects unusable qualification team templates, falls back to `season-roster-2026.ts`, and requires verified race results before publishing season standings.

### OpenF1 Sprint Qualifying Cron Update (July 2026)
- **OpenF1 API Integration**: Integrated `api.openf1.org` to retrieve Sprint Qualifying classifications.
- **Sprint Qualifying Table Generation**: Added `generateSprintQualifyingWikitext` to compile results into a structured wikitext table with SQ1/SQ2/SQ3 segment classification times, 107% time calculations, and official FIA source reference.
- **Standings-Based Constructor Mapping**: Maps driver numbers to constructors dynamically using active standings or fallback Jolpica constructor endpoint queries.
- **Unit and Integration Tests**: Added a dedicated `verify-openf1-sync.ts` test suite to the project test runner to verify time formatting and wikitext table compilation.

### Entry List Syncing & Team Details (July 2026)
- **Automated Entry List Syncing**: Cron worker automatically updates and maintains Grand Prix Entry List tables, detecting rookie/test drivers in FP1 results, validating them against the FIA Entry List PDF, and appending them to the "Test Drivers for Practice 1" subsection.
- **2026 Team Details finalization**: Updated `TEAM_DETAILS_2026` with finalized chassis designations (e.g., Cadillac MAC-26) and engine models (e.g., Red Bull Ford DM01, Audi AFR 26, Honda RA626H) for the 2026 season.
- **FIA Source References**: Automates formatting of source references pointing directly to official FIA entry list decision PDFs.

### Caching, Rate-Limiting & Performance Tuning (June–July 2026)
- **Permanent KV Caching**: Concluded session data (results, qualifying, sprint, standings, schedules) is cached permanently once finalized, eliminating unnecessary Jolpica API fetches and worker subrequests.
- **429 Rate-Limit Tuning**: Replaced multi-step exponential backoffs with a single 15-second retry to prevent execution wall-time timeouts and stay under Cloudflare Worker limits.
- **Cron Frequency Optimization**: Adjusted high-frequency cron execution interval from 10 minutes to 21 minutes to stay within free-tier KV write and request quotas.
- **Concurrent Promise Pooling**: Implemented parallel execution for career standings and stats template updates using a concurrent pool helper (`runInPool` with concurrency limit of 7).

### Stats Sync Gates & KV Safeguards (July 2026)
- **Stats Sync Environment Gate**: Introduced the `STATS_SYNC` environment gate variable; when not set to `TRUE`, the scheduled worker skips all KV checks, Jolpica fetches, and edits to the 21 career stats templates.
- **Edit Failure Safety Buffer**: Implemented consecutive edit failure monitoring (`src/kv-ops.ts`) with a threshold (`MAX_EDIT_FAILURES = 3`) to block wiki edits to pages experiencing persistent issues, preventing API token locking or quota depletion.
- **Additional Stats Categories**: Expanded career stats tracking to compute and update `Doubles`, `HatTricks`, and `Grand Chelems` templates automatically.

### UI & Refactoring Improvements (July 2026)
- **Dynamic Race Slug Generation**: Unified slug and ID generation helpers (`getF1RacingKey`, `getF1comRaceId`) across frontend and backend, resolving Japan and Abu Dhabi slug inconsistencies.
- **Frontend Regex Patch**: Resolved backslash regex escaping bugs inside frontend template strings.

### Practice Sessions & Test Drivers (June 2026)
- **Automated Practice Scraping**: Cron worker scrapes F1.com FP1/FP2/FP3 results during active race weekends and updates the GP page practice results table incrementally.
- **LLM Practice Reports**: Generates FP1, FP2, and FP3 section reports using crawled official F1.com session articles, with prompts highlighting incidents, spins, mechanical issues, and driver feedback.
- **Test Driver Entry List**: Detects test drivers in FP1 results and appends them to the wiki Entry List with team details; unknown nationalities default to `{{FIA}}` and trigger a daily email warning.
- **Empty Results Retry**: Skips KV sync when F1.com has not yet published results, allowing automatic retry on the next 21-minute cron execution.
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
- **Constructor & Track Mapping**: São Paulo GP rename (2021+), Barcelona-Catalunya GP (2026), Bahrain GP override (2026), Revolut Audi and Cadillac team templates.
- **Dependabot**: Automated dependency update PRs configured via `.github/dependabot.yml`.

---

Built for Formula One Wiki enthusiasts and contributors.
