# Graph Report - workspace  (2026-07-20)

## Corpus Check
- 18 files · ~52,273 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 449 nodes · 1062 edges · 12 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4fb38fe0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- F1 API Clients and Types
- Wiki Standings Syncing and Formatting
- Ergast API Python Client (pyergast)
- F1 Statistics and Calculations
- F1.com Practice Scraping and Reports
- TypeScript Configuration (tsconfig)
- Daily Reporting and Cloudflare Worker HTTP
- Project Dependencies and Scripts (package.json)
- Repository Documentation and Settings (README)
- Community 9
- Community 10
- Community 12

## God Nodes (most connected - your core abstractions)
1. `scheduled()` - 80 edges
2. `fetch()` - 43 edges
3. `compilerOptions` - 21 edges
4. `cachedJolpicaJson()` - 18 edges
5. `generatePracticeWikitext()` - 17 edges
6. `getSchedule()` - 16 edges
7. `syncStatsTemplates()` - 15 edges
8. `trackedKvPut()` - 14 edges
9. `syncLatestNewsEvents()` - 13 edges
10. `editPage()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `NPM Dependabot Updates` --conceptually_related_to--> `F1 Fandom Wiki Automator`  [INFERRED]
  .github/dependabot.yml → README.md
- `Pip Dependabot Updates` --conceptually_related_to--> `F1 Fandom Wiki Automator`  [INFERRED]
  .github/dependabot.yml → README.md
- `throttledFetch()` --calls--> `fetch()`  [INFERRED]
  src/f1-api-cache.ts → src/index.ts
- `fetchJolpicaUncached()` --calls--> `fetch()`  [INFERRED]
  src/f1-api-cache.ts → src/index.ts
- `callGemini()` --calls--> `fetch()`  [INFERRED]
  src/llm-reporter.ts → src/index.ts

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "F1 API Clients and Types"
Cohesion: 0.06
Nodes (72): ConstructorStanding, Driver, QualifyingResult, ScheduleRace, buildDriverNameLookup(), CONSTRUCTOR_SUFFIXES, FIA_NAT_TO_FLAG, FiaDriverRow (+64 more)

### Community 1 - "Wiki Standings Syncing and Formatting"
Cohesion: 0.07
Nodes (68): createF1ApiContext(), createF1ApiContextFromEnv(), getScheduleWithRetry(), hasQualifyingSessionTimes(), checkAndSendDailySummary(), corsResponse(), findInfoboxParamLineIndex(), findInfoboxRange() (+60 more)

### Community 2 - "Ergast API Python Client (pyergast)"
Cohesion: 0.08
Nodes (30): constructor_standings(), driver_standings(), find_circuitid(), find_constructorid(), find_driverid(), get_circuits(), get_constructors(), get_drivers() (+22 more)

### Community 3 - "F1 Statistics and Calculations"
Cohesion: 0.27
Nodes (9): driverIdToWikiName, normalizeName(), cleanText(), findDriverId(), getStatsF1Results(), ROUND_TO_STATS_F1_SLUG, StatsF1DriverResult, StatsF1VerificationReport (+1 more)

### Community 4 - "F1.com Practice Scraping and Reports"
Cohesion: 0.13
Nodes (21): calculate_position_change(), convert_time_differential_to_absolute(), create_practice_scraping_report(), find_107_time(), get_practice_data_from_f1_com(), get_previous_race(), getFlag(), grid() (+13 more)

### Community 5 - "TypeScript Configuration (tsconfig)"
Cohesion: 0.08
Nodes (25): @cloudflare/workers-types, es2022, src/**/*, compilerOptions, alwaysStrict, emitDecoratorMetadata, esModuleInterop, experimentalDecorators (+17 more)

### Community 6 - "Daily Reporting and Cloudflare Worker HTTP"
Cohesion: 0.06
Nodes (74): buildConstructorLookup(), buildFiaEntryListUrl(), buildPracticeSessionUrl(), cachedJolpicaJson(), circuitsMatch(), cleanOfficialName(), Constructor, convertOpenF1PracticeResults() (+66 more)

### Community 7 - "Project Dependencies and Scripts (package.json)"
Cohesion: 0.10
Nodes (19): @cloudflare/workers-types, dependencies, unpdf, description, devDependencies, @cloudflare/workers-types, typescript, wrangler (+11 more)

### Community 8 - "Repository Documentation and Settings (README)"
Cohesion: 0.08
Nodes (27): NPM Dependabot Updates, Pip Dependabot Updates, Automated Syncing & Background Tasks (Cron Workers), Caching, Rate-Limiting & Performance Tuning (June–July 2026), Core Functionality, Daily Reporting, Data Processing, Earlier Improvements (also since last README update) (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (35): findBestHeader(), acquireCronSyncLock(), apiLogBuffer, ApiLogEntry, beginKvInvocation(), bufferApiLog(), clearEditFailures(), EditBlockedError (+27 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (17): PracticeSessionData, bufferKvWarning(), appendKvWarning(), callGemini(), callOpenAI(), callWorkersAI(), extractArticleLinks(), extractArticleText() (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (30): buildFetchInit(), CachedScheduleRace, CacheTtl, classifyJolpicaUrl(), F1ApiContext, fetchJolpica(), fetchJolpicaUncached(), getCacheTtl() (+22 more)

## Knowledge Gaps
- **97 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scheduled()` connect `Wiki Standings Syncing and Formatting` to `F1 API Clients and Types`, `Community 9`, `Community 10`, `Daily Reporting and Cloudflare Worker HTTP`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `fetch()` connect `Daily Reporting and Cloudflare Worker HTTP` to `F1 API Clients and Types`, `Wiki Standings Syncing and Formatting`, `F1 Statistics and Calculations`, `Community 9`, `Community 10`, `Community 12`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `trackedKvPut()` connect `Daily Reporting and Cloudflare Worker HTTP` to `Wiki Standings Syncing and Formatting`, `Community 12`, `Community 9`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `fetch()` (e.g. with `fetchJolpicaUncached()` and `throttledFetch()`) actually correct?**
  _`fetch()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `F1 API Clients and Types` be split into smaller, more focused modules?**
  _Cohesion score 0.05960755275823769 - nodes in this community are weakly interconnected._
- **Should `Wiki Standings Syncing and Formatting` be split into smaller, more focused modules?**
  _Cohesion score 0.07002012072434607 - nodes in this community are weakly interconnected._