# Graph Report - f1-fandom  (2026-06-26)

## Corpus Check
- 15 files · ~37,969 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 239 nodes · 444 edges · 10 communities (9 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `893c8981`
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

## God Nodes (most connected - your core abstractions)
1. `fetch()` - 34 edges
2. `scheduled()` - 33 edges
3. `compilerOptions` - 21 edges
4. `F1 Fandom Wiki Automator` - 17 edges
5. `getSchedule()` - 11 edges
6. `syncLatestNewsEvents()` - 9 edges
7. `syncCareerStandingsTemplates()` - 9 edges
8. `syncStatsTemplates()` - 9 edges
9. `editPage()` - 9 edges
10. `getRaceResult()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `NPM Dependabot Updates` --conceptually_related_to--> `F1 Fandom Wiki Automator`  [INFERRED]
  .github/dependabot.yml → README.md
- `Pip Dependabot Updates` --conceptually_related_to--> `F1 Fandom Wiki Automator`  [INFERRED]
  .github/dependabot.yml → README.md
- `getSchedule()` --calls--> `fetch()`  [INFERRED]
  src/f1-api.ts → src/index.ts
- `getRaceResult()` --calls--> `fetch()`  [INFERRED]
  src/f1-api.ts → src/index.ts
- `getQualifyingResult()` --calls--> `fetch()`  [INFERRED]
  src/f1-api.ts → src/index.ts

## Import Cycles
- None detected.

## Communities (10 total, 1 thin omitted)

### Community 0 - "F1 API Clients and Types"
Cohesion: 0.09
Nodes (28): syncLatestNewsEvents(), calculate107Time(), CONSTRUCTORS, COUNTRY_FLAGS, DRIVER_TO_CONSTRUCTOR_2026, EventInfo, FLAGS, formatDateRange() (+20 more)

### Community 1 - "Wiki Standings Syncing and Formatting"
Cohesion: 0.10
Nodes (45): getConstructorStandings(), getDriversForRace(), getDriversForRaceWithFallback(), getDriverStandings(), getF1RacingKey(), mapDriverNames(), parsePracticeHTML(), scrapePracticeSession() (+37 more)

### Community 2 - "Ergast API Python Client (pyergast)"
Cohesion: 0.08
Nodes (30): constructor_standings(), driver_standings(), find_circuitid(), find_constructorid(), find_driverid(), get_circuits(), get_constructors(), get_drivers() (+22 more)

### Community 3 - "F1 Statistics and Calculations"
Cohesion: 0.11
Nodes (24): getQualifyingResult(), getRaceResult(), getSchedule(), getScheduleWithRetry(), RaceResult, syncStatsTemplates(), BASE_STATS_2025, calculateRoundStats() (+16 more)

### Community 4 - "F1.com Practice Scraping and Reports"
Cohesion: 0.13
Nodes (21): calculate_position_change(), convert_time_differential_to_absolute(), create_practice_scraping_report(), find_107_time(), get_practice_data_from_f1_com(), get_previous_race(), getFlag(), grid() (+13 more)

### Community 5 - "TypeScript Configuration (tsconfig)"
Cohesion: 0.09
Nodes (22): compilerOptions, alwaysStrict, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, lib, module (+14 more)

### Community 6 - "Daily Reporting and Cloudflare Worker HTTP"
Cohesion: 0.18
Nodes (11): cleanOfficialName(), Constructor, ConstructorStanding, Driver, DriverStanding, fetchOfficialRaceName(), PracticeResults, PracticeSessionData (+3 more)

### Community 7 - "Project Dependencies and Scripts (package.json)"
Cohesion: 0.17
Nodes (11): description, devDependencies, @cloudflare/workers-types, typescript, wrangler, main, name, scripts (+3 more)

### Community 8 - "Repository Documentation and Settings (README)"
Cohesion: 0.10
Nodes (23): NPM Dependabot Updates, Pip Dependabot Updates, Automated Reporting & Content Generation, Automated Syncing & Background Tasks, Automated Syncing & Background Tasks (Cron Workers), Core Functionality, Daily Reporting, Data Processing (+15 more)

## Knowledge Gaps
- **70 isolated node(s):** `graphify`, `name`, `version`, `description`, `main` (+65 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fetch()` connect `Wiki Standings Syncing and Formatting` to `F1 API Clients and Types`, `F1 Statistics and Calculations`, `Daily Reporting and Cloudflare Worker HTTP`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `scheduled()` connect `Wiki Standings Syncing and Formatting` to `F1 API Clients and Types`, `F1 Statistics and Calculations`, `Daily Reporting and Cloudflare Worker HTTP`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `fetch()` (e.g. with `fetchOfficialRaceName()` and `getConstructorStandings()`) actually correct?**
  _`fetch()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `F1 Fandom Wiki Automator` (e.g. with `NPM Dependabot Updates` and `Pip Dependabot Updates`) actually correct?**
  _`F1 Fandom Wiki Automator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `graphify`, `Convert a time differential (e.g., +0.087s) to an absolute time based on a base`, `Get the previous race number for comparison.     Returns None if this is the fi` to the rest of the system?**
  _93 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `F1 API Clients and Types` be split into smaller, more focused modules?**
  _Cohesion score 0.08912655971479501 - nodes in this community are weakly interconnected._
- **Should `Wiki Standings Syncing and Formatting` be split into smaller, more focused modules?**
  _Cohesion score 0.09693877551020408 - nodes in this community are weakly interconnected._