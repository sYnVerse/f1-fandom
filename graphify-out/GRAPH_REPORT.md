# Graph Report - workspace  (2026-07-27)

## Corpus Check
- 19 files · ~55,575 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 473 nodes · 1165 edges · 11 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `72ac2558`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- F1 API Clients and Types
- Wiki Standings Syncing and Formatting
- Ergast API Python Client (pyergast)
- F1 Statistics and Calculations
- TypeScript Configuration (tsconfig)
- Daily Reporting and Cloudflare Worker HTTP
- Project Dependencies and Scripts (package.json)
- Repository Documentation and Settings (README)
- wiki.ts
- llm-reporter.ts
- f1-api-cache.ts

## God Nodes (most connected - your core abstractions)
1. `scheduled()` - 88 edges
2. `fetch()` - 43 edges
3. `compilerOptions` - 21 edges
4. `cachedJolpicaJson()` - 20 edges
5. `generatePracticeWikitext()` - 18 edges
6. `getSchedule()` - 15 edges
7. `syncStatsTemplates()` - 15 edges
8. `trackedKvPut()` - 15 edges
9. `editPage()` - 15 edges
10. `syncCareerStandingsTemplates()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `NPM Dependabot Updates` --conceptually_related_to--> `F1 Fandom Wiki Automator`  [INFERRED]
  .github/dependabot.yml → README.md
- `Pip Dependabot Updates` --conceptually_related_to--> `F1 Fandom Wiki Automator`  [INFERRED]
  .github/dependabot.yml → README.md
- `scrape_f1_practice_data()` --calls--> `get_schedule()`  [EXTRACTED]
  f1.py → pyergast.py
- `grid()` --calls--> `get_qualifying_result()`  [EXTRACTED]
  f1.py → pyergast.py
- `qualifying()` --calls--> `get_qualifying_result()`  [EXTRACTED]
  f1.py → pyergast.py

## Import Cycles
- None detected.

## Communities (11 total, 0 thin omitted)

### Community 0 - "F1 API Clients and Types"
Cohesion: 0.06
Nodes (76): Driver, buildDriverNameLookup(), CONSTRUCTOR_SUFFIXES, FIA_NAT_TO_FLAG, FiaDriverRow, findFp1SectionStart(), FP1_SECTION_MARKERS, getFlagFromNatCode() (+68 more)

### Community 1 - "Wiki Standings Syncing and Formatting"
Cohesion: 0.07
Nodes (75): getConstructorStandings(), getLatestConcludedRound(), getScheduleWithRetry(), setActiveSeasonSchedule(), computeNextLatestDataValues(), findInfoboxParamLineIndex(), findInfoboxRange(), formatResult() (+67 more)

### Community 2 - "Ergast API Python Client (pyergast)"
Cohesion: 0.06
Nodes (52): calculate_position_change(), convert_time_differential_to_absolute(), create_practice_scraping_report(), find_107_time(), get_practice_data_from_f1_com(), get_previous_race(), getFlag(), grid() (+44 more)

### Community 3 - "F1 Statistics and Calculations"
Cohesion: 0.09
Nodes (33): F1ApiContext, getLapChart(), getQualifyingResult(), getRaceResult(), getSchedule(), mapRaceResults(), normalizeScheduleRaces(), RaceResult (+25 more)

### Community 5 - "TypeScript Configuration (tsconfig)"
Cohesion: 0.08
Nodes (25): @cloudflare/workers-types, es2022, src/**/*, compilerOptions, alwaysStrict, emitDecoratorMetadata, esModuleInterop, experimentalDecorators (+17 more)

### Community 6 - "Daily Reporting and Cloudflare Worker HTTP"
Cohesion: 0.06
Nodes (62): buildConstructorLookup(), buildFiaEntryListUrl(), buildPracticeSessionUrl(), CachedScheduleRace, createF1ApiContext(), createF1ApiContextFromEnv(), circuitsMatch(), cleanOfficialName() (+54 more)

### Community 7 - "Project Dependencies and Scripts (package.json)"
Cohesion: 0.10
Nodes (19): @cloudflare/workers-types, dependencies, unpdf, description, devDependencies, @cloudflare/workers-types, typescript, wrangler (+11 more)

### Community 8 - "Repository Documentation and Settings (README)"
Cohesion: 0.08
Nodes (27): NPM Dependabot Updates, Pip Dependabot Updates, Automated Syncing & Background Tasks (Cron Workers), Caching, Rate-Limiting & Performance Tuning (June–July 2026), Core Functionality, Daily Reporting, Data Processing, Earlier Improvements (also since last README update) (+19 more)

### Community 9 - "wiki.ts"
Cohesion: 0.10
Nodes (34): checkAndSendDailySummary(), findBestHeader(), apiLogBuffer, ApiLogEntry, beginKvInvocation(), bufferApiLog(), clearEditFailures(), editFailureKey() (+26 more)

### Community 10 - "llm-reporter.ts"
Cohesion: 0.20
Nodes (17): PracticeSessionData, bufferKvWarning(), appendKvWarning(), callGemini(), callOpenAI(), callWorkersAI(), extractArticleLinks(), extractArticleText() (+9 more)

### Community 12 - "f1-api-cache.ts"
Cohesion: 0.15
Nodes (31): buildFetchInit(), cachedJolpicaJson(), CacheTtl, classifyJolpicaUrl(), fetchJolpica(), fetchJolpicaUncached(), getCacheTtl(), getFirstPracticeEndTime() (+23 more)

## Knowledge Gaps
- **97 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scheduled()` connect `Wiki Standings Syncing and Formatting` to `F1 API Clients and Types`, `F1 Statistics and Calculations`, `Daily Reporting and Cloudflare Worker HTTP`, `wiki.ts`, `llm-reporter.ts`, `f1-api-cache.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `fetch()` connect `Daily Reporting and Cloudflare Worker HTTP` to `F1 API Clients and Types`, `Wiki Standings Syncing and Formatting`, `F1 Statistics and Calculations`, `wiki.ts`, `llm-reporter.ts`, `f1-api-cache.ts`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `trackedKvPut()` connect `F1 Statistics and Calculations` to `Wiki Standings Syncing and Formatting`, `f1-api-cache.ts`, `Daily Reporting and Cloudflare Worker HTTP`, `wiki.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `fetch()` (e.g. with `fetchJolpicaUncached()` and `throttledFetch()`) actually correct?**
  _`fetch()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `F1 API Clients and Types` be split into smaller, more focused modules?**
  _Cohesion score 0.059940059940059943 - nodes in this community are weakly interconnected._
- **Should `Wiki Standings Syncing and Formatting` be split into smaller, more focused modules?**
  _Cohesion score 0.06893106893106893 - nodes in this community are weakly interconnected._