# Graph Report - workspace  (2026-07-28)

## Corpus Check
- 20 files · ~57,237 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 493 nodes · 1193 edges · 11 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `948e62ee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- wikitext-generator.ts
- f1-api.ts
- index.ts
- pyergast.py
- f1-api-cache.ts
- Recent Updates & Changelog
- compilerOptions
- stats.ts
- kv-ops.ts
- package.json
- llm-reporter.ts

## God Nodes (most connected - your core abstractions)
1. `scheduled()` - 85 edges
2. `fetch()` - 34 edges
3. `compilerOptions` - 21 edges
4. `cachedJolpicaJson()` - 20 edges
5. `generatePracticeWikitext()` - 20 edges
6. `trackedKvPut()` - 18 edges
7. `getSchedule()` - 15 edges
8. `editPage()` - 15 edges
9. `syncCareerStandingsTemplates()` - 14 edges
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

## Communities (11 total, 0 thin omitted)

### Community 0 - "wikitext-generator.ts"
Cohesion: 0.06
Nodes (78): ConstructorStanding, Driver, DriverStanding, buildDriverNameLookup(), CONSTRUCTOR_SUFFIXES, FIA_NAT_TO_FLAG, FiaDriverRow, findFp1SectionStart() (+70 more)

### Community 1 - "f1-api.ts"
Cohesion: 0.07
Nodes (47): buildConstructorLookup(), buildFiaEntryListUrl(), buildPracticeSessionUrl(), circuitsMatch(), cleanOfficialName(), Constructor, constructorFromSeasonRoster(), convertOpenF1PracticeResults() (+39 more)

### Community 2 - "index.ts"
Cohesion: 0.05
Nodes (105): isCareerStandingsBehind(), isCareerStandingsOwnerRound(), shouldSyncCareerStandingsForRound(), fetchRoundJolpicaData(), getConstructorStandings(), getDriversForRaceWithFallback(), getDriverStandings(), getF1RacingKey() (+97 more)

### Community 3 - "pyergast.py"
Cohesion: 0.06
Nodes (52): calculate_position_change(), convert_time_differential_to_absolute(), create_practice_scraping_report(), find_107_time(), get_practice_data_from_f1_com(), get_previous_race(), getFlag(), grid() (+44 more)

### Community 4 - "f1-api-cache.ts"
Cohesion: 0.12
Nodes (37): buildFetchInit(), cachedJolpicaJson(), CachedScheduleRace, CacheTtl, classifyJolpicaUrl(), createF1ApiContext(), createF1ApiContextFromEnv(), F1ApiContext (+29 more)

### Community 5 - "Recent Updates & Changelog"
Cohesion: 0.08
Nodes (25): Automated Syncing & Background Tasks (Cron Workers), Caching, Rate-Limiting & Performance Tuning (June–July 2026), Core Functionality, Daily Reporting, Data Processing, Earlier Improvements (also since last README update), Entry List Syncing & Team Details (July 2026), F1 Fandom Wiki Automator (+17 more)

### Community 6 - "compilerOptions"
Cohesion: 0.08
Nodes (25): @cloudflare/workers-types, es2022, src/**/*, compilerOptions, alwaysStrict, emitDecoratorMetadata, esModuleInterop, experimentalDecorators (+17 more)

### Community 7 - "stats.ts"
Cohesion: 0.12
Nodes (24): getLapChart(), RaceResult, ScheduleRace, BASE_STATS_2025, calculateRoundStats(), CIRCUIT_LENGTHS, driverIdToWikiName, DriverStats (+16 more)

### Community 8 - "kv-ops.ts"
Cohesion: 0.09
Nodes (40): flushPendingWikiEdits(), apiLogBuffer, ApiLogEntry, bufferApiLog(), clearEditFailures(), clearPendingWikiEdit(), EditBlockedError, editFailureKey() (+32 more)

### Community 10 - "package.json"
Cohesion: 0.10
Nodes (19): @cloudflare/workers-types, dependencies, unpdf, description, devDependencies, @cloudflare/workers-types, typescript, wrangler (+11 more)

### Community 11 - "llm-reporter.ts"
Cohesion: 0.20
Nodes (17): PracticeSessionData, bufferKvWarning(), appendKvWarning(), callGemini(), callOpenAI(), callWorkersAI(), extractArticleLinks(), extractArticleText() (+9 more)

## Knowledge Gaps
- **100 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+95 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scheduled()` connect `index.ts` to `wikitext-generator.ts`, `f1-api.ts`, `f1-api-cache.ts`, `kv-ops.ts`, `llm-reporter.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `trackedKvPut()` connect `index.ts` to `kv-ops.ts`, `f1-api.ts`, `f1-api-cache.ts`, `stats.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `cachedJolpicaJson()` connect `f1-api-cache.ts` to `f1-api.ts`, `index.ts`, `stats.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _100 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `wikitext-generator.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.057911392405063294 - nodes in this community are weakly interconnected._
- **Should `f1-api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06972789115646258 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05004170141784821 - nodes in this community are weakly interconnected._