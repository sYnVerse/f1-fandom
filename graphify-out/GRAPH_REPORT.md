# Graph Report - f1-fandom  (2026-07-04)

## Corpus Check
- 17 files · ~50,365 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 398 nodes · 873 edges · 12 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a4cc1c9b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_F1 API Clients and Types|F1 API Clients and Types]]
- [[_COMMUNITY_Wiki Standings Syncing and Formatting|Wiki Standings Syncing and Formatting]]
- [[_COMMUNITY_Ergast API Python Client (pyergast)|Ergast API Python Client (pyergast)]]
- [[_COMMUNITY_F1 Statistics and Calculations|F1 Statistics and Calculations]]
- [[_COMMUNITY_F1.com Practice Scraping and Reports|F1.com Practice Scraping and Reports]]
- [[_COMMUNITY_TypeScript Configuration (tsconfig)|TypeScript Configuration (tsconfig)]]
- [[_COMMUNITY_Daily Reporting and Cloudflare Worker HTTP|Daily Reporting and Cloudflare Worker HTTP]]
- [[_COMMUNITY_Project Dependencies and Scripts (package.json)|Project Dependencies and Scripts (package.json)]]
- [[_COMMUNITY_Repository Documentation and Settings (README)|Repository Documentation and Settings (README)]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `scheduled()` - 67 edges
2. `fetch()` - 42 edges
3. `compilerOptions` - 21 edges
4. `getSchedule()` - 15 edges
5. `syncStatsTemplates()` - 15 edges
6. `editPage()` - 13 edges
7. `F1 Fandom Wiki Automator` - 13 edges
8. `syncCareerStandingsTemplates()` - 12 edges
9. `trackedKvPut()` - 12 edges
10. `syncLatestNewsEvents()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `NPM Dependabot Updates` --conceptually_related_to--> `F1 Fandom Wiki Automator`  [INFERRED]
  .github/dependabot.yml → README.md
- `Pip Dependabot Updates` --conceptually_related_to--> `F1 Fandom Wiki Automator`  [INFERRED]
  .github/dependabot.yml → README.md
- `throttledFetch()` --calls--> `fetch()`  [INFERRED]
  src/f1-api-cache.ts → src/index.ts
- `fetchJolpicaUncached()` --calls--> `fetch()`  [INFERRED]
  src/f1-api-cache.ts → src/index.ts
- `getDriverStandings()` --calls--> `fetch()`  [INFERRED]
  src/f1-api.ts → src/index.ts

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "F1 API Clients and Types"
Cohesion: 0.07
Nodes (47): ConstructorStanding, DriverStanding, QualifyingResult, RaceResult, addTestDriversToEntryList(), calculate107Time(), CONSTRUCTORS, COUNTRY_FLAGS (+39 more)

### Community 1 - "Wiki Standings Syncing and Formatting"
Cohesion: 0.08
Nodes (58): fetchRoundJolpicaData(), getConstructorStandings(), getDriverStandings(), getScheduleWithRetry(), corsResponse(), findBestHeader(), findInfoboxParamLineIndex(), findInfoboxRange() (+50 more)

### Community 2 - "Ergast API Python Client (pyergast)"
Cohesion: 0.08
Nodes (30): constructor_standings(), driver_standings(), find_circuitid(), find_constructorid(), find_driverid(), get_circuits(), get_constructors(), get_drivers() (+22 more)

### Community 3 - "F1 Statistics and Calculations"
Cohesion: 0.12
Nodes (28): cachedJolpicaJson(), getDriversForRace(), getDriversForRaceWithFallback(), getLapChart(), getQualifyingResult(), getRaceResult(), getSchedule(), fetch() (+20 more)

### Community 4 - "F1.com Practice Scraping and Reports"
Cohesion: 0.13
Nodes (21): calculate_position_change(), convert_time_differential_to_absolute(), create_practice_scraping_report(), find_107_time(), get_practice_data_from_f1_com(), get_previous_race(), getFlag(), grid() (+13 more)

### Community 5 - "TypeScript Configuration (tsconfig)"
Cohesion: 0.09
Nodes (22): compilerOptions, alwaysStrict, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, lib, module (+14 more)

### Community 6 - "Daily Reporting and Cloudflare Worker HTTP"
Cohesion: 0.08
Nodes (35): binaryStringtoUint8Array(), buildConstructorLookup(), buildFiaEntryListUrl(), buildPracticeSessionUrl(), circuitsMatch(), cleanOfficialName(), Constructor, decompressZlib() (+27 more)

### Community 7 - "Project Dependencies and Scripts (package.json)"
Cohesion: 0.14
Nodes (13): description, devDependencies, @cloudflare/workers-types, typescript, wrangler, main, name, scripts (+5 more)

### Community 8 - "Repository Documentation and Settings (README)"
Cohesion: 0.08
Nodes (27): NPM Dependabot Updates, Pip Dependabot Updates, Automated Syncing & Background Tasks (Cron Workers), Caching, Rate-Limiting & Performance Tuning (June–July 2026), Core Functionality, Daily Reporting, Data Processing, Earlier Improvements (also since last README update) (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (39): checkAndSendDailySummary(), acquireCronSyncLock(), apiLogBuffer, ApiLogEntry, beginKvInvocation(), bufferApiLog(), clearEditFailures(), EditBlockedError (+31 more)

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (16): PracticeSessionData, bufferKvWarning(), appendKvWarning(), callGemini(), callOpenAI(), callWorkersAI(), extractArticleLinks(), extractArticleText() (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (28): buildFetchInit(), CachedScheduleRace, CacheTtl, classifyJolpicaUrl(), createF1ApiContext(), createF1ApiContextFromEnv(), F1ApiContext, fetchJolpica() (+20 more)

## Knowledge Gaps
- **93 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scheduled()` connect `Wiki Standings Syncing and Formatting` to `F1 API Clients and Types`, `F1 Statistics and Calculations`, `Daily Reporting and Cloudflare Worker HTTP`, `Community 9`, `Community 10`, `Community 12`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `fetch()` connect `F1 Statistics and Calculations` to `F1 API Clients and Types`, `Wiki Standings Syncing and Formatting`, `Daily Reporting and Cloudflare Worker HTTP`, `Community 9`, `Community 10`, `Community 12`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `trackedKvPut()` connect `Community 9` to `Wiki Standings Syncing and Formatting`, `F1 Statistics and Calculations`, `Community 12`, `Daily Reporting and Cloudflare Worker HTTP`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `fetch()` (e.g. with `fetchJolpicaUncached()` and `throttledFetch()`) actually correct?**
  _`fetch()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Convert a time differential (e.g., +0.087s) to an absolute time based on a base`, `Get the previous race number for comparison.     Returns None if this is the fi`, `Validate if a URL appears to be a valid F1.com practice session URL.` to the rest of the system?**
  _116 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `F1 API Clients and Types` be split into smaller, more focused modules?**
  _Cohesion score 0.06531204644412192 - nodes in this community are weakly interconnected._
- **Should `Wiki Standings Syncing and Formatting` be split into smaller, more focused modules?**
  _Cohesion score 0.07615018508725542 - nodes in this community are weakly interconnected._