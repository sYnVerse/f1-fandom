# Graph Report - workspace  (2026-07-29)

## Corpus Check
- 20 files · ~57,915 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 502 nodes · 1224 edges · 17 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c0fb07a8`
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
- wikitext-parse.ts
- package.json
- llm-reporter.ts
- fetch
- statsf1.ts
- getPracticeSessionWithFallback
- mapDriverNames
- getSchedule

## God Nodes (most connected - your core abstractions)
1. `scheduled()` - 86 edges
2. `fetch()` - 34 edges
3. `compilerOptions` - 21 edges
4. `cachedJolpicaJson()` - 20 edges
5. `generatePracticeWikitext()` - 19 edges
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

## Communities (17 total, 0 thin omitted)

### Community 0 - "wikitext-generator.ts"
Cohesion: 0.06
Nodes (80): Driver, stripTrailingDriverTla(), buildDriverNameLookup(), CONSTRUCTOR_SUFFIXES, FIA_NAT_TO_FLAG, FiaDriverRow, findFp1SectionStart(), FP1_SECTION_MARKERS (+72 more)

### Community 1 - "f1-api.ts"
Cohesion: 0.09
Nodes (33): buildConstructorLookup(), buildFiaEntryListUrl(), CachedScheduleRace, circuitsMatch(), cleanOfficialName(), Constructor, constructorFromSeasonRoster(), ConstructorStanding (+25 more)

### Community 2 - "index.ts"
Cohesion: 0.06
Nodes (72): isCareerStandingsBehind(), isCareerStandingsOwnerRound(), shouldSyncCareerStandingsForRound(), getLatestConcludedRound(), hasQualifyingSessionTimes(), setActiveSeasonSchedule(), applyPendingWikiEditSyncFlags(), computeNextLatestDataValues() (+64 more)

### Community 3 - "pyergast.py"
Cohesion: 0.06
Nodes (52): calculate_position_change(), convert_time_differential_to_absolute(), create_practice_scraping_report(), find_107_time(), get_practice_data_from_f1_com(), get_previous_race(), getFlag(), grid() (+44 more)

### Community 4 - "f1-api-cache.ts"
Cohesion: 0.14
Nodes (33): buildFetchInit(), cachedJolpicaJson(), CacheTtl, classifyJolpicaUrl(), createF1ApiContext(), createF1ApiContextFromEnv(), fetchJolpica(), fetchJolpicaUncached() (+25 more)

### Community 5 - "Recent Updates & Changelog"
Cohesion: 0.08
Nodes (25): Automated Syncing & Background Tasks (Cron Workers), Caching, Rate-Limiting & Performance Tuning (June–July 2026), Core Functionality, Daily Reporting, Data Processing, Earlier Improvements (also since last README update), Entry List Syncing & Team Details (July 2026), F1 Fandom Wiki Automator (+17 more)

### Community 6 - "compilerOptions"
Cohesion: 0.08
Nodes (25): @cloudflare/workers-types, es2022, src/**/*, compilerOptions, alwaysStrict, emitDecoratorMetadata, esModuleInterop, experimentalDecorators (+17 more)

### Community 7 - "stats.ts"
Cohesion: 0.15
Nodes (20): F1ApiContext, getLapChart(), getQualifyingResult(), getRaceResult(), mapRaceResults(), RaceResult, ScheduleRace, BASE_STATS_2025 (+12 more)

### Community 8 - "kv-ops.ts"
Cohesion: 0.09
Nodes (41): checkAndSendDailySummary(), flushPendingWikiEdits(), syncCareerResultsTestDrivers(), acquireCronSyncLock(), apiLogBuffer, ApiLogEntry, bufferApiLog(), clearEditFailures() (+33 more)

### Community 9 - "wikitext-parse.ts"
Cohesion: 0.19
Nodes (18): driverNameHasGluedTla(), practiceDataHasGluedDriverTlas(), findBestHeader(), getSectionContent(), replaceSectionWikitext(), countPracticeDriverLinks(), extractPracticeResultsSection(), practiceWikitextHasGluedDriverNames() (+10 more)

### Community 10 - "package.json"
Cohesion: 0.10
Nodes (19): @cloudflare/workers-types, dependencies, unpdf, description, devDependencies, @cloudflare/workers-types, typescript, wrangler (+11 more)

### Community 11 - "llm-reporter.ts"
Cohesion: 0.20
Nodes (17): PracticeSessionData, bufferKvWarning(), appendKvWarning(), callGemini(), callOpenAI(), callWorkersAI(), extractArticleLinks(), extractArticleText() (+9 more)

### Community 12 - "fetch"
Cohesion: 0.21
Nodes (12): driversFromBulkPayloads(), fetchRoundJolpicaData(), getConstructorStandings(), getDriversForRace(), getDriversForRaceWithFallback(), getDriverStandings(), getSeasonDrivers(), parsePracticeHTML() (+4 more)

### Community 13 - "statsf1.ts"
Cohesion: 0.27
Nodes (9): driverIdToWikiName, normalizeName(), cleanText(), findDriverId(), getStatsF1Results(), ROUND_TO_STATS_F1_SLUG, StatsF1DriverResult, StatsF1VerificationReport (+1 more)

### Community 14 - "getPracticeSessionWithFallback"
Cohesion: 0.25
Nodes (8): buildPracticeSessionUrl(), fetchOpenF1Json(), getF1comRaceId(), getF1RacingKey(), getOpenF1PracticeSessionResult(), getPracticeSessionTargetDate(), getPracticeSessionWithFallback(), matchOpenF1PracticeSession()

### Community 15 - "mapDriverNames"
Cohesion: 0.29
Nodes (7): convertOpenF1PracticeResults(), formatOpenF1PracticeTime(), formatOpenF1SessionSegmentTime(), formatOpenF1Time(), mapDriverNames(), resolveOpenF1DriverName(), titleCaseWord()

### Community 16 - "getSchedule"
Cohesion: 0.33
Nodes (7): getSchedule(), getScheduleWithRetry(), normalizeScheduleRaces(), scheduleCacheKey(), runInPool(), syncStatsTemplates(), get2026CumulativeStats()

## Knowledge Gaps
- **102 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scheduled()` connect `index.ts` to `wikitext-generator.ts`, `f1-api.ts`, `f1-api-cache.ts`, `kv-ops.ts`, `wikitext-parse.ts`, `llm-reporter.ts`, `fetch`, `getPracticeSessionWithFallback`, `getSchedule`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `trackedKvPut()` connect `kv-ops.ts` to `f1-api.ts`, `index.ts`, `f1-api-cache.ts`, `stats.ts`, `getPracticeSessionWithFallback`, `getSchedule`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `cachedJolpicaJson()` connect `f1-api-cache.ts` to `f1-api.ts`, `stats.ts`, `kv-ops.ts`, `fetch`, `getSchedule`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `wikitext-generator.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.057512797350195724 - nodes in this community are weakly interconnected._
- **Should `f1-api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08907563025210084 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06425153793574846 - nodes in this community are weakly interconnected._