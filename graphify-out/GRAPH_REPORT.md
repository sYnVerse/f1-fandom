# Graph Report - workspace  (2026-07-27)

## Corpus Check
- 19 files · ~55,971 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 476 nodes · 1142 edges · 12 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c462f592`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- F1 API Clients and Types
- Wiki Standings Syncing and Formatting
- Ergast API Python Client (pyergast)
- F1 Statistics and Calculations
- fia-pdf-parser.ts
- TypeScript Configuration (tsconfig)
- Daily Reporting and Cloudflare Worker HTTP
- Project Dependencies and Scripts (package.json)
- Repository Documentation and Settings (README)
- wiki.ts
- llm-reporter.ts
- llm-reporter.ts

## God Nodes (most connected - your core abstractions)
1. `scheduled()` - 82 edges
2. `fetch()` - 34 edges
3. `compilerOptions` - 21 edges
4. `cachedJolpicaJson()` - 20 edges
5. `generatePracticeWikitext()` - 20 edges
6. `trackedKvPut()` - 16 edges
7. `getSchedule()` - 15 edges
8. `syncCareerStandingsTemplates()` - 14 edges
9. `editPage()` - 14 edges
10. `updateEntryListTableIfNeeded()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `scrape_f1_practice_data()` --calls--> `get_schedule()`  [EXTRACTED]
  f1.py → pyergast.py
- `grid()` --calls--> `get_qualifying_result()`  [EXTRACTED]
  f1.py → pyergast.py
- `qualifying()` --calls--> `get_qualifying_result()`  [EXTRACTED]
  f1.py → pyergast.py
- `race()` --calls--> `get_race_result()`  [EXTRACTED]
  f1.py → pyergast.py
- `race()` --calls--> `get_sprint_result()`  [EXTRACTED]
  f1.py → pyergast.py

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "F1 API Clients and Types"
Cohesion: 0.06
Nodes (80): Driver, buildDriverNameLookup(), CONSTRUCTOR_SUFFIXES, FIA_NAT_TO_FLAG, FiaDriverRow, findFp1SectionStart(), FP1_SECTION_MARKERS, getFlagFromNatCode() (+72 more)

### Community 1 - "Wiki Standings Syncing and Formatting"
Cohesion: 0.05
Nodes (72): buildConstructorLookup(), buildFiaEntryListUrl(), buildPracticeSessionUrl(), CachedScheduleRace, createF1ApiContext(), createF1ApiContextFromEnv(), circuitsMatch(), cleanOfficialName() (+64 more)

### Community 2 - "Ergast API Python Client (pyergast)"
Cohesion: 0.07
Nodes (68): getLatestConcludedRound(), setActiveSeasonSchedule(), computeNextLatestDataValues(), findInfoboxParamLineIndex(), findInfoboxRange(), formatResult(), generateLatestDataWikitext(), generateWikiResultsText() (+60 more)

### Community 3 - "F1 Statistics and Calculations"
Cohesion: 0.06
Nodes (52): calculate_position_change(), convert_time_differential_to_absolute(), create_practice_scraping_report(), find_107_time(), get_practice_data_from_f1_com(), get_previous_race(), getFlag(), grid() (+44 more)

### Community 4 - "fia-pdf-parser.ts"
Cohesion: 0.15
Nodes (31): buildFetchInit(), cachedJolpicaJson(), CacheTtl, classifyJolpicaUrl(), fetchJolpica(), fetchJolpicaUncached(), getCacheTtl(), getFirstPracticeEndTime() (+23 more)

### Community 5 - "TypeScript Configuration (tsconfig)"
Cohesion: 0.08
Nodes (25): Automated Syncing & Background Tasks (Cron Workers), Caching, Rate-Limiting & Performance Tuning (June–July 2026), Core Functionality, Daily Reporting, Data Processing, Earlier Improvements (also since last README update), Entry List Syncing & Team Details (July 2026), F1 Fandom Wiki Automator (+17 more)

### Community 6 - "Daily Reporting and Cloudflare Worker HTTP"
Cohesion: 0.08
Nodes (25): @cloudflare/workers-types, es2022, src/**/*, compilerOptions, alwaysStrict, emitDecoratorMetadata, esModuleInterop, experimentalDecorators (+17 more)

### Community 7 - "Project Dependencies and Scripts (package.json)"
Cohesion: 0.13
Nodes (22): F1ApiContext, RaceResult, ScheduleRace, BASE_STATS_2025, CIRCUIT_LENGTHS, driverIdToWikiName, DriverStats, formatDriverLine() (+14 more)

### Community 8 - "Repository Documentation and Settings (README)"
Cohesion: 0.17
Nodes (22): findBestHeader(), bufferApiLog(), getApiUrl(), getSectionContent(), isSectionEmptyOrPlaceholder(), logApiCall(), loginToWiki(), replaceSectionWikitext() (+14 more)

### Community 9 - "wiki.ts"
Cohesion: 0.14
Nodes (20): checkAndSendDailySummary(), acquireCronSyncLock(), apiLogBuffer, ApiLogEntry, beginKvInvocation(), clearEditFailures(), editFailureKey(), endKvInvocation() (+12 more)

### Community 10 - "llm-reporter.ts"
Cohesion: 0.10
Nodes (19): @cloudflare/workers-types, dependencies, unpdf, description, devDependencies, @cloudflare/workers-types, typescript, wrangler (+11 more)

### Community 11 - "llm-reporter.ts"
Cohesion: 0.20
Nodes (17): PracticeSessionData, bufferKvWarning(), appendKvWarning(), callGemini(), callOpenAI(), callWorkersAI(), extractArticleLinks(), extractArticleText() (+9 more)

## Knowledge Gaps
- **99 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+94 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scheduled()` connect `Ergast API Python Client (pyergast)` to `F1 API Clients and Types`, `Wiki Standings Syncing and Formatting`, `fia-pdf-parser.ts`, `Repository Documentation and Settings (README)`, `wiki.ts`, `llm-reporter.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `trackedKvPut()` connect `wiki.ts` to `Wiki Standings Syncing and Formatting`, `Ergast API Python Client (pyergast)`, `fia-pdf-parser.ts`, `Project Dependencies and Scripts (package.json)`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `cachedJolpicaJson()` connect `fia-pdf-parser.ts` to `Wiki Standings Syncing and Formatting`, `wiki.ts`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _99 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `F1 API Clients and Types` be split into smaller, more focused modules?**
  _Cohesion score 0.05600722673893405 - nodes in this community are weakly interconnected._
- **Should `Wiki Standings Syncing and Formatting` be split into smaller, more focused modules?**
  _Cohesion score 0.05225225225225225 - nodes in this community are weakly interconnected._
- **Should `Ergast API Python Client (pyergast)` be split into smaller, more focused modules?**
  _Cohesion score 0.07394366197183098 - nodes in this community are weakly interconnected._