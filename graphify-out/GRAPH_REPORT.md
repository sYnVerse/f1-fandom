# Graph Report - f1-fandom  (2026-07-28)

## Corpus Check
- 20 files · ~58,598 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 508 nodes · 1230 edges · 11 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `201a4b80`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_wikitext-generator.ts|wikitext-generator.ts]]
- [[_COMMUNITY_f1-api.ts|f1-api.ts]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_pyergast.py|pyergast.py]]
- [[_COMMUNITY_f1-api-cache.ts|f1-api-cache.ts]]
- [[_COMMUNITY_Recent Updates & Changelog|Recent Updates & Changelog]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_stats.ts|stats.ts]]
- [[_COMMUNITY_kv-ops.ts|kv-ops.ts]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_llm-reporter.ts|llm-reporter.ts]]

## God Nodes (most connected - your core abstractions)
1. `scheduled()` - 86 edges
2. `fetch()` - 34 edges
3. `compilerOptions` - 21 edges
4. `cachedJolpicaJson()` - 20 edges
5. `generatePracticeWikitext()` - 19 edges
6. `trackedKvPut()` - 18 edges
7. `Recent Updates & Changelog` - 17 edges
8. `getSchedule()` - 15 edges
9. `editPage()` - 15 edges
10. `syncCareerStandingsTemplates()` - 14 edges

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
Cohesion: 0.05
Nodes (83): Driver, driverNameHasGluedTla(), practiceDataHasGluedDriverTlas(), stripTrailingDriverTla(), buildDriverNameLookup(), CONSTRUCTOR_SUFFIXES, FIA_NAT_TO_FLAG, FiaDriverRow (+75 more)

### Community 1 - "f1-api.ts"
Cohesion: 0.05
Nodes (71): buildConstructorLookup(), buildFiaEntryListUrl(), buildPracticeSessionUrl(), CachedScheduleRace, createF1ApiContext(), createF1ApiContextFromEnv(), circuitsMatch(), cleanOfficialName() (+63 more)

### Community 2 - "index.ts"
Cohesion: 0.06
Nodes (83): isCareerStandingsBehind(), isCareerStandingsOwnerRound(), shouldSyncCareerStandingsForRound(), getLatestConcludedRound(), hasQualifyingSessionTimes(), setActiveSeasonSchedule(), applyPendingWikiEditSyncFlags(), computeNextLatestDataValues() (+75 more)

### Community 3 - "pyergast.py"
Cohesion: 0.06
Nodes (52): calculate_position_change(), convert_time_differential_to_absolute(), create_practice_scraping_report(), find_107_time(), get_practice_data_from_f1_com(), get_previous_race(), getFlag(), grid() (+44 more)

### Community 4 - "f1-api-cache.ts"
Cohesion: 0.15
Nodes (31): buildFetchInit(), cachedJolpicaJson(), CacheTtl, classifyJolpicaUrl(), fetchJolpica(), fetchJolpicaUncached(), getCacheTtl(), getFirstPracticeEndTime() (+23 more)

### Community 5 - "Recent Updates & Changelog"
Cohesion: 0.06
Nodes (31): Automated Syncing & Background Tasks (Cron Workers), Caching, Rate-Limiting & Performance Tuning (June–July 2026), Career Standings & Results Synchronization Reliability (July 2026), Core Functionality, Daily Reporting, Data Processing, Earlier Improvements (also since last README update), Entry List & Practice Session Test-Driver Consistency (July 2026) (+23 more)

### Community 6 - "compilerOptions"
Cohesion: 0.08
Nodes (25): @cloudflare/workers-types, es2022, src/**/*, compilerOptions, alwaysStrict, emitDecoratorMetadata, esModuleInterop, experimentalDecorators (+17 more)

### Community 7 - "stats.ts"
Cohesion: 0.12
Nodes (24): F1ApiContext, RaceResult, ScheduleRace, BASE_STATS_2025, CIRCUIT_LENGTHS, driverIdToWikiName, DriverStats, formatDriverLine() (+16 more)

### Community 8 - "kv-ops.ts"
Cohesion: 0.08
Nodes (48): checkAndSendDailySummary(), flushPendingWikiEdits(), apiLogBuffer, ApiLogEntry, bufferApiLog(), clearEditFailures(), clearPendingWikiEdit(), EditBlockedError (+40 more)

### Community 10 - "package.json"
Cohesion: 0.10
Nodes (19): @cloudflare/workers-types, dependencies, unpdf, description, devDependencies, @cloudflare/workers-types, typescript, wrangler (+11 more)

### Community 11 - "llm-reporter.ts"
Cohesion: 0.20
Nodes (17): PracticeSessionData, bufferKvWarning(), appendKvWarning(), callGemini(), callOpenAI(), callWorkersAI(), extractArticleLinks(), extractArticleText() (+9 more)

## Knowledge Gaps
- **108 isolated node(s):** `Core Functionality`, `Automated Syncing & Background Tasks (Cron Workers)`, `Wiki Career Stats Tracking`, `Web Dashboard & API Endpoints`, `Daily Reporting` (+103 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scheduled()` connect `index.ts` to `wikitext-generator.ts`, `f1-api.ts`, `f1-api-cache.ts`, `kv-ops.ts`, `llm-reporter.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `trackedKvPut()` connect `index.ts` to `kv-ops.ts`, `f1-api.ts`, `f1-api-cache.ts`, `stats.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `cachedJolpicaJson()` connect `f1-api-cache.ts` to `f1-api.ts`, `index.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `Core Functionality`, `Automated Syncing & Background Tasks (Cron Workers)`, `Wiki Career Stats Tracking` to the rest of the system?**
  _131 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `wikitext-generator.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0546218487394958 - nodes in this community are weakly interconnected._
- **Should `f1-api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05403348554033485 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.058254963427377224 - nodes in this community are weakly interconnected._