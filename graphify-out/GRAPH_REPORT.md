# Graph Report - f1-fandom  (2026-06-28)

## Corpus Check
- 17 files · ~42,777 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 341 nodes · 723 edges · 11 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cb9cc415`
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

## God Nodes (most connected - your core abstractions)
1. `scheduled()` - 55 edges
2. `fetch()` - 39 edges
3. `compilerOptions` - 21 edges
4. `F1 Fandom Wiki Automator` - 17 edges
5. `getSchedule()` - 13 edges
6. `syncCareerStandingsTemplates()` - 12 edges
7. `syncStatsTemplates()` - 12 edges
8. `editPage()` - 12 edges
9. `syncLatestNewsEvents()` - 11 edges
10. `getRaceResult()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `NPM Dependabot Updates` --conceptually_related_to--> `F1 Fandom Wiki Automator`  [INFERRED]
  .github/dependabot.yml → README.md
- `Pip Dependabot Updates` --conceptually_related_to--> `F1 Fandom Wiki Automator`  [INFERRED]
  .github/dependabot.yml → README.md
- `callGemini()` --calls--> `fetch()`  [INFERRED]
  src/llm-reporter.ts → src/index.ts
- `callOpenAI()` --calls--> `fetch()`  [INFERRED]
  src/llm-reporter.ts → src/index.ts
- `fetchF1comSessionArticle()` --calls--> `fetch()`  [INFERRED]
  src/llm-reporter.ts → src/index.ts

## Import Cycles
- None detected.

## Communities (11 total, 0 thin omitted)

### Community 0 - "F1 API Clients and Types"
Cohesion: 0.07
Nodes (41): ConstructorStanding, Driver, DriverStanding, QualifyingResult, addTestDriversToEntryList(), calculate107Time(), CONSTRUCTORS, COUNTRY_FLAGS (+33 more)

### Community 1 - "Wiki Standings Syncing and Formatting"
Cohesion: 0.08
Nodes (49): getF1RacingKey(), findInfoboxParamLineIndex(), findInfoboxRange(), formatResult(), generateWikiResultsText(), getInfoboxParameterValue(), getOrdinal(), getPracticeEndTime() (+41 more)

### Community 2 - "Ergast API Python Client (pyergast)"
Cohesion: 0.08
Nodes (30): constructor_standings(), driver_standings(), find_circuitid(), find_constructorid(), find_driverid(), get_circuits(), get_constructors(), get_drivers() (+22 more)

### Community 3 - "F1 Statistics and Calculations"
Cohesion: 0.12
Nodes (20): RaceResult, ScheduleRace, trackedKvPut(), BASE_STATS_2025, CIRCUIT_LENGTHS, driverIdToWikiName, DriverStats, get2026CumulativeStats() (+12 more)

### Community 4 - "F1.com Practice Scraping and Reports"
Cohesion: 0.13
Nodes (21): calculate_position_change(), convert_time_differential_to_absolute(), create_practice_scraping_report(), find_107_time(), get_practice_data_from_f1_com(), get_previous_race(), getFlag(), grid() (+13 more)

### Community 5 - "TypeScript Configuration (tsconfig)"
Cohesion: 0.09
Nodes (22): compilerOptions, alwaysStrict, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, lib, module (+14 more)

### Community 6 - "Daily Reporting and Cloudflare Worker HTTP"
Cohesion: 0.12
Nodes (34): buildPracticeSessionUrl(), backoffDelayMs(), cachedJolpicaJson(), createF1ApiContext(), F1ApiContext, fetchJolpica(), fetchJolpicaUncached(), parseRetryAfterMs() (+26 more)

### Community 7 - "Project Dependencies and Scripts (package.json)"
Cohesion: 0.14
Nodes (13): description, devDependencies, @cloudflare/workers-types, typescript, wrangler, main, name, scripts (+5 more)

### Community 8 - "Repository Documentation and Settings (README)"
Cohesion: 0.09
Nodes (26): NPM Dependabot Updates, Pip Dependabot Updates, Automated Syncing & Background Tasks, Automated Syncing & Background Tasks (Cron Workers), Core Functionality, Daily Reporting, Data Processing, Earlier Improvements (also since last README update) (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (36): checkAndSendDailySummary(), findBestHeader(), apiLogBuffer, ApiLogEntry, beginKvInvocation(), bufferApiLog(), clearEditFailures(), EditBlockedError (+28 more)

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (16): PracticeSessionData, bufferKvWarning(), appendKvWarning(), callGemini(), callOpenAI(), callWorkersAI(), extractArticleLinks(), extractArticleText() (+8 more)

## Knowledge Gaps
- **86 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+81 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fetch()` connect `Daily Reporting and Cloudflare Worker HTTP` to `F1 API Clients and Types`, `Wiki Standings Syncing and Formatting`, `F1 Statistics and Calculations`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `scheduled()` connect `Wiki Standings Syncing and Formatting` to `F1 API Clients and Types`, `Community 9`, `Community 10`, `Daily Reporting and Cloudflare Worker HTTP`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `editPage()` connect `Community 9` to `Wiki Standings Syncing and Formatting`, `Daily Reporting and Cloudflare Worker HTTP`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `fetch()` (e.g. with `fetchJolpicaUncached()` and `fetchOfficialRaceName()`) actually correct?**
  _`fetch()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `F1 Fandom Wiki Automator` (e.g. with `NPM Dependabot Updates` and `Pip Dependabot Updates`) actually correct?**
  _`F1 Fandom Wiki Automator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Convert a time differential (e.g., +0.087s) to an absolute time based on a base`, `Get the previous race number for comparison.     Returns None if this is the fi`, `Validate if a URL appears to be a valid F1.com practice session URL.` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `F1 API Clients and Types` be split into smaller, more focused modules?**
  _Cohesion score 0.0666049953746531 - nodes in this community are weakly interconnected._