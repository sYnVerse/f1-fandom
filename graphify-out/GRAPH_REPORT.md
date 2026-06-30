# Graph Report - f1-fandom  (2026-06-29)

## Corpus Check
- 17 files · ~43,764 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 355 nodes · 765 edges · 13 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4a43f191`
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
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `scheduled()` - 57 edges
2. `fetch()` - 41 edges
3. `compilerOptions` - 21 edges
4. `F1 Fandom Wiki Automator` - 17 edges
5. `getSchedule()` - 14 edges
6. `syncStatsTemplates()` - 13 edges
7. `editPage()` - 13 edges
8. `syncCareerStandingsTemplates()` - 12 edges
9. `syncLatestNewsEvents()` - 11 edges
10. `getRaceResult()` - 10 edges

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

## Communities (13 total, 0 thin omitted)

### Community 0 - "F1 API Clients and Types"
Cohesion: 0.06
Nodes (42): addTestDriversToEntryList(), calculate107Time(), CONSTRUCTORS, COUNTRY_FLAGS, detectTestDriversFromFp1(), DRIVER_TO_CONSTRUCTOR_2026, ENTRY_LIST_HEADING_VARIANTS, EventInfo (+34 more)

### Community 1 - "Wiki Standings Syncing and Formatting"
Cohesion: 0.09
Nodes (50): fetchRoundJolpicaData(), getConstructorStandings(), getDriversForRaceWithFallback(), getDriverStandings(), findInfoboxParamLineIndex(), findInfoboxRange(), formatResult(), generateWikiResultsText() (+42 more)

### Community 2 - "Ergast API Python Client (pyergast)"
Cohesion: 0.08
Nodes (30): constructor_standings(), driver_standings(), find_circuitid(), find_constructorid(), find_driverid(), get_circuits(), get_constructors(), get_drivers() (+22 more)

### Community 3 - "F1 Statistics and Calculations"
Cohesion: 0.11
Nodes (23): F1ApiContext, RaceResult, ScheduleRace, trackedKvPut(), BASE_STATS_2025, CIRCUIT_LENGTHS, driverIdToWikiName, DriverStats (+15 more)

### Community 4 - "F1.com Practice Scraping and Reports"
Cohesion: 0.13
Nodes (21): calculate_position_change(), convert_time_differential_to_absolute(), create_practice_scraping_report(), find_107_time(), get_practice_data_from_f1_com(), get_previous_race(), getFlag(), grid() (+13 more)

### Community 5 - "TypeScript Configuration (tsconfig)"
Cohesion: 0.09
Nodes (22): compilerOptions, alwaysStrict, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, lib, module (+14 more)

### Community 6 - "Daily Reporting and Cloudflare Worker HTTP"
Cohesion: 0.11
Nodes (32): buildPracticeSessionUrl(), cachedJolpicaJson(), createF1ApiContext(), createF1ApiContextFromEnv(), cleanOfficialName(), Constructor, ConstructorStanding, Driver (+24 more)

### Community 7 - "Project Dependencies and Scripts (package.json)"
Cohesion: 0.14
Nodes (13): description, devDependencies, @cloudflare/workers-types, typescript, wrangler, main, name, scripts (+5 more)

### Community 8 - "Repository Documentation and Settings (README)"
Cohesion: 0.09
Nodes (26): NPM Dependabot Updates, Pip Dependabot Updates, Automated Syncing & Background Tasks, Automated Syncing & Background Tasks (Cron Workers), Core Functionality, Daily Reporting, Data Processing, Earlier Improvements (also since last README update) (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (20): findBestHeader(), bufferApiLog(), getSectionContent(), isSectionEmptyOrPlaceholder(), logApiCall(), loginToWiki(), replaceSectionWikitext(), WikiConfig (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.21
Nodes (15): bufferKvWarning(), appendKvWarning(), callGemini(), callOpenAI(), callWorkersAI(), extractArticleLinks(), extractArticleText(), fetchF1comSessionArticle() (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (15): checkAndSendDailySummary(), apiLogBuffer, ApiLogEntry, beginKvInvocation(), clearEditFailures(), EditBlockedError, editFailureKey(), endKvInvocation() (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (12): backoffDelayMs(), buildFetchInit(), classifyJolpicaUrl(), fetchJolpica(), fetchJolpicaUncached(), getCacheTtl(), isResponseEmpty(), JolpicaUrlClass (+4 more)

## Knowledge Gaps
- **87 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+82 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fetch()` connect `Daily Reporting and Cloudflare Worker HTTP` to `F1 API Clients and Types`, `Wiki Standings Syncing and Formatting`, `F1 Statistics and Calculations`, `Community 9`, `Community 10`, `Community 11`, `Community 12`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `scheduled()` connect `Wiki Standings Syncing and Formatting` to `F1 API Clients and Types`, `Daily Reporting and Cloudflare Worker HTTP`, `Community 9`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `trackedKvPut()` connect `F1 Statistics and Calculations` to `Wiki Standings Syncing and Formatting`, `Community 11`, `Community 12`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `fetch()` (e.g. with `fetchJolpicaUncached()` and `throttledFetch()`) actually correct?**
  _`fetch()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `F1 Fandom Wiki Automator` (e.g. with `NPM Dependabot Updates` and `Pip Dependabot Updates`) actually correct?**
  _`F1 Fandom Wiki Automator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Convert a time differential (e.g., +0.087s) to an absolute time based on a base`, `Get the previous race number for comparison.     Returns None if this is the fi`, `Validate if a URL appears to be a valid F1.com practice session URL.` to the rest of the system?**
  _110 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `F1 API Clients and Types` be split into smaller, more focused modules?**
  _Cohesion score 0.06471631205673758 - nodes in this community are weakly interconnected._