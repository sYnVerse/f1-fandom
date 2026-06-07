import { frontendHtml } from './frontend-html';
import { 
  getSchedule, 
  getRaceResult, 
  getQualifyingResult, 
  getDriverStandings, 
  getConstructorStandings,
  getDriversForRaceWithFallback,
  scrapePracticeSession,
  parsePracticeHTML,
  mapDriverNames,
  fetchOfficialRaceName,
  getF1RacingKey
} from './f1-api';
import { 
  generateGridWikitext, 
  generateQualifyingWikitext, 
  generateRaceWikitext, 
  generateStandingsWikitext,
  generatePracticeWikitext,
  generateBlankGPWikitext,
  generateLatestEventsWikitext,
  EventInfo,
  formatDesktopDate,
  formatMobileDate,
  generateCareerPointsWikitext,
  generateCareerPositionWikitext,
  generateCareerTeamPositionWikitext
} from './wikitext-generator';
import { loginToWiki, getPageContent, editPage, replaceSectionWikitext } from './wiki';
import { 
  get2026CumulativeStats, 
  updateTemplateContent, 
  updateCorrectionText, 
  driverIdToWikiName 
} from './stats';
import { getStatsF1Results, verifyResults } from './statsf1';

// CORS response helper
function corsResponse(body: string | object, status = 200, headers: Record<string, string> = {}): Response {
  const defaultHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  
  const responseBody = typeof body === 'string' ? body : JSON.stringify(body);
  
  return new Response(responseBody, {
    status,
    headers: { ...defaultHeaders, ...headers }
  });
}

async function verifyTurnstile(token: string, secretKey: string | undefined, request: Request): Promise<boolean> {
  const url = new URL(request.url);
  // Bypass Turnstile on localhost or 127.0.0.1
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]') {
    console.log("Bypassing Turnstile verification on localhost.");
    return true;
  }

  // Bypass Turnstile if secretKey is not configured (since they use real sitekey in wrangler.toml, test secretkey will always fail)
  if (!secretKey) {
    console.warn("TURNSTILE_SECRET_KEY is not set. Bypassing Turnstile verification.");
    return true;
  }

  if (!token) return false;

  try {
    const verifyBody = new FormData();
    verifyBody.append("secret", secretKey);
    verifyBody.append("response", token);
    verifyBody.append("remoteip", request.headers.get("CF-Connecting-IP") || "");

    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: verifyBody,
    });
    const verifyResult = await verifyResponse.json() as { success: boolean };
    return verifyResult.success;
  } catch (e) {
    console.error("Turnstile verification error:", e);
    return false;
  }
}

// Router and Handler
export default {
  async fetch(request: Request, _env: any, _ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // Handle OPTIONS requests (preflight)
    if (method === 'OPTIONS') {
      return corsResponse('', 204);
    }

    try {
      // 1. Serve SPA Frontend
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const siteKey = _env.TURNSTILE_SITE_KEY || "0x4AAAAAABoDGtBnq2BXlSqW";
        const injectedHtml = frontendHtml.replace('__TURNSTILE_SITE_KEY__', siteKey);
        return new Response(injectedHtml, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      // 2. Fetch Season Schedule
      if (url.pathname === '/api/schedule' && method === 'GET') {
        const yearStr = url.searchParams.get('year');
        if (!yearStr) return corsResponse({ error: 'Year parameter required' }, 400);
        
        const year = parseInt(yearStr, 10);
        const schedule = await getSchedule(year);
        return corsResponse({ schedule });
      }

      // 2.5 Generate Blank GP Page Wikitext
      if (url.pathname === '/api/generate-blank-gp' && method === 'GET') {
        const yearStr = url.searchParams.get('year');
        const roundStr = url.searchParams.get('round');
        
        if (!yearStr || !roundStr) {
          return corsResponse({ error: 'Year and round parameters required' }, 400);
        }
        
        const year = parseInt(yearStr, 10);
        const round = parseInt(roundStr, 10);
        
        const schedule = await getSchedule(year);
        const race = schedule.find(r => parseInt(r.round, 10) === round);
        if (!race) {
          return corsResponse({ error: `Round ${round} not found in schedule` }, 404);
        }
        
        const drivers = await getDriversForRaceWithFallback(year, round);
        
        const racingKey = getF1RacingKey(race.raceName);
        const officialName = await fetchOfficialRaceName(year, racingKey).catch(() => null);
        const wikitext = generateBlankGPWikitext(race, drivers, officialName);
        
        return corsResponse({ wikitext });
      }

      // 3. Fetch Race Data and Generate Wikitexts
      if (url.pathname === '/api/race-data' && method === 'GET') {
        const yearStr = url.searchParams.get('year');
        const roundStr = url.searchParams.get('round');
        
        if (!yearStr || !roundStr) {
          return corsResponse({ error: 'Year and round parameters required' }, 400);
        }
        
        const year = parseInt(yearStr, 10);
        const round = parseInt(roundStr, 10);

        // Fetch everything concurrently
        const [
          drivers,
          raceResults,
          qualiResults,
          currentDrivers,
          prevDrivers,
          currentConstructors,
          prevConstructors,
        ] = await Promise.all([
          getDriversForRaceWithFallback(year, round),
          getRaceResult(year, round, false).catch(() => []),
          getQualifyingResult(year, round).catch(() => []),
          getDriverStandings(year, round).catch(() => []),
          round > 1 ? getDriverStandings(year, round - 1).catch(() => null) : Promise.resolve(null),
          getConstructorStandings(year, round).catch(() => []),
          round > 1 ? getConstructorStandings(year, round - 1).catch(() => null) : Promise.resolve(null),
        ]);

        // Sprint is optional, query it separately
        let sprintResults: any[] = [];
        try {
          sprintResults = await getRaceResult(year, round, true);
        } catch (e) {
          // No sprint race
        }

        // Generate wikitexts
        const gridWikitext = generateGridWikitext(qualiResults);
        const qualifyingWikitext = generateQualifyingWikitext(qualiResults);
        const raceWikitext = generateRaceWikitext(raceResults, false);
        const sprintWikitext = sprintResults.length > 0 ? generateRaceWikitext(sprintResults, true) : 'No sprint data available for this round.';
        const standingsWikitext = generateStandingsWikitext(
          currentDrivers,
          prevDrivers,
          currentConstructors,
          prevConstructors
        );

        return corsResponse({
          drivers,
          wikitexts: {
            grid: gridWikitext,
            qualifying: qualifyingWikitext,
            race: raceWikitext,
            sprint: sprintWikitext,
            standings: standingsWikitext
          }
        });
      }

      // 4. Scrape or Parse Practice HTML
      if (url.pathname === '/api/scrape-practice' && method === 'POST') {
        const body = await request.json() as any;
        const { year, round, url: fp1Url, pastedHtml, fallbackOnly, turnstileToken } = body;

        const isTokenValid = await verifyTurnstile(turnstileToken, _env.TURNSTILE_SECRET_KEY, request);
        if (!isTokenValid) {
          return corsResponse({ error: 'CAPTCHA verification failed. Please try again.' }, 403);
        }

        if (!year || !round) {
          return corsResponse({ error: 'Year and round parameters required' }, 400);
        }

        const yr = parseInt(year, 10);
        const rd = parseInt(round, 10);

        const drivers = await getDriversForRaceWithFallback(yr, rd);
        const qualiResults = await getQualifyingResult(yr, rd).catch(() => null);

        // Fallback Only: empty table
        if (fallbackOnly) {
          const wikitext = generatePracticeWikitext(drivers, qualiResults, null, null, null);
          return corsResponse({ wikitext });
        }

        // Pasted HTML: manual fallback parsing
        if (pastedHtml) {
          const parsed = parsePracticeHTML(pastedHtml);
          const mapped = mapDriverNames(parsed, drivers);
          // Set as FP1, leave others DNP
          const wikitext = generatePracticeWikitext(drivers, qualiResults, mapped, null, null);
          return corsResponse({ wikitext, fp1: mapped });
        }

        // Auto Scraping
        if (!fp1Url) return corsResponse({ error: 'Practice URL required' }, 400);

        const fp2Url = fp1Url.replace('/practice/1', '/practice/2');
        const fp3Url = fp1Url.replace('/practice/1', '/practice/3');

        // Scrape sessions concurrently but catch individual failures gracefully
        const [fp1, fp2, fp3] = await Promise.all([
          scrapePracticeSession(fp1Url, drivers).catch(() => null),
          scrapePracticeSession(fp2Url, drivers).catch(() => null),
          scrapePracticeSession(fp3Url, drivers).catch(() => null),
        ]);

        const wikitext = generatePracticeWikitext(drivers, qualiResults, fp1, fp2, fp3);

        return corsResponse({ wikitext, fp1, fp2, fp3 });
      }

      // 5. Check Wiki Page Status
      if (url.pathname === '/api/wiki-status' && method === 'POST') {
        const body = await request.json() as any;
        const { domain, title } = body;
        if (!domain || !title) return corsResponse({ error: 'Domain and title required' }, 400);

        const pageInfo = await getPageContent(domain, title, undefined, _env.WIKI_API_ENDPOINT, _env.PROXY_SECRET, _env.F1_WIKI_STATE);
        return corsResponse({ exists: pageInfo.exists });
      }

      // 6. Fetch Page Content
      if (url.pathname === '/api/wiki-content' && method === 'POST') {
        const body = await request.json() as any;
        const { domain, title } = body;
        if (!domain || !title) return corsResponse({ error: 'Domain and title required' }, 400);

        const pageInfo = await getPageContent(domain, title, undefined, _env.WIKI_API_ENDPOINT, _env.PROXY_SECRET, _env.F1_WIKI_STATE);
        return corsResponse({ exists: pageInfo.exists, content: pageInfo.content });
      }

      // 7. Test Login Connection
      if (url.pathname === '/api/wiki-login-test' && method === 'POST') {
        const body = await request.json() as any;
        const { domain, username, password, turnstileToken } = body;

        const isTokenValid = await verifyTurnstile(turnstileToken, _env.TURNSTILE_SECRET_KEY, request);
        if (!isTokenValid) {
          return corsResponse({ error: 'CAPTCHA verification failed. Please try again.' }, 403);
        }

        if (!domain || !username || !password) {
          return corsResponse({ error: 'Domain, username, and password required' }, 400);
        }

        try {
          await loginToWiki({ 
            domain, username, botPassword: password,
            apiEndpoint: _env.WIKI_API_ENDPOINT,
            proxySecret: _env.PROXY_SECRET,
            kvState: _env.F1_WIKI_STATE
          });
          return corsResponse({ success: true });
        } catch (e: any) {
          return corsResponse({ success: false, error: e.message }, 401);
        }
      }

      // 8. Publish or edit page
      if (url.pathname === '/api/publish' && method === 'POST') {
        const body = await request.json() as any;
        const { 
          domain, username, password, 
          title, text, summary, 
          sectionHeader, currentFullText,
          turnstileToken
        } = body;

        const isTokenValid = await verifyTurnstile(turnstileToken, _env.TURNSTILE_SECRET_KEY, request);
        if (!isTokenValid) {
          return corsResponse({ error: 'CAPTCHA verification failed. Please try again.' }, 403);
        }

        if (!domain || !username || !password || !title || !text) {
          return corsResponse({ error: 'Missing required parameters' }, 400);
        }

        try {
          const session = await loginToWiki({ 
            domain, username, botPassword: password,
            apiEndpoint: _env.WIKI_API_ENDPOINT,
            proxySecret: _env.PROXY_SECRET,
            kvState: _env.F1_WIKI_STATE
          });
          
          let finalText = text;
          if (sectionHeader) {
            // Edit section logic
            const baseText = currentFullText || '';
            finalText = replaceSectionWikitext(baseText, sectionHeader, text);
          }

          await editPage(domain, session, title, finalText, summary || 'Bot edit', _env.WIKI_API_ENDPOINT);
          return corsResponse({ success: true });
        } catch (e: any) {
          return corsResponse({ success: false, error: e.message }, 500);
        }
      }

      // 8.5 Preview Stats Updates
      if (url.pathname === '/api/stats-preview' && method === 'GET') {
        const roundStr = url.searchParams.get('round');
        if (!roundStr) return corsResponse({ error: 'Round parameter required' }, 400);
        
        const round = parseInt(roundStr, 10);
        const domain = _env.DEFAULT_WIKI_DOMAIN || "f1.fandom.com";
        
        try {
          console.log(`Calculating cumulative stats up to round ${round}...`);
          
          // Run Jolpi API fetch, StatsF1 classification fetch, schedule fetch, and cumulative stats calculation concurrently
          const [cumulativeStats, jolpiResults, statsF1Results, schedule] = await Promise.all([
            get2026CumulativeStats(_env, round),
            getRaceResult(2026, round, false).catch(() => []),
            getStatsF1Results(round).catch(() => null),
            getSchedule(2026).catch(() => [])
          ]);
          
          const race = schedule.find((r: any) => parseInt(r.round, 10) === round);
          const raceName = race ? race.raceName : '';
          
          let winnerCode = 'VER';
          if (jolpiResults.length > 0 && jolpiResults[0].driver?.code) {
            winnerCode = jolpiResults[0].driver.code;
          }
          
          let verificationReport = null;
          if (statsF1Results) {
            const report = verifyResults(jolpiResults, statsF1Results);
            verificationReport = {
              success: report.success,
              mismatches: report.mismatches,
              statsF1Results,
              jolpiResults: jolpiResults.map((j: any) => ({
                position: j.positionText || j.position,
                driverId: j.driver.driverId,
                driverName: j.driver.givenName + " " + j.driver.familyName.toUpperCase(),
                points: parseFloat(j.points) || 0
              }))
            };
          } else {
            verificationReport = {
              success: false,
              mismatches: ["Could not fetch or parse classification data from StatsF1 (round might not have concluded yet)."],
              statsF1Results: [],
              jolpiResults: jolpiResults.map((j: any) => ({
                position: j.positionText || j.position,
                driverId: j.driver.driverId,
                driverName: j.driver.givenName + " " + j.driver.familyName.toUpperCase(),
                points: parseFloat(j.points) || 0
              }))
            };
          }
          
          const templates = [
            "Championships", "Distance", "DistanceLed", "Doubles", "Entries",
            "FastestLaps", "FrontRows", "Grand Chelems", "HatTricks", "Laps",
            "LapsLed", "Podiums", "Points", "Poles", "RacesLed",
            "SprintFastestLaps", "SprintPodiums", "SprintPoles", "SprintWins", "Starts", "Wins"
          ];
          
          const previewResults = await Promise.all(templates.map(async (temp) => {
            const pageTitle = `Template:Stats/${temp}`;
            const pageInfo = await getPageContent(domain, pageTitle, undefined, _env.WIKI_API_ENDPOINT, _env.PROXY_SECRET, _env.F1_WIKI_STATE).catch(() => ({ exists: false, content: '' }));
            
            if (!pageInfo.exists) {
              return { template: temp, exists: false, changed: false, updates: [], wikitext: '' };
            }
            
            const updated = updateTemplateContent(temp, pageInfo.content, cumulativeStats);
            let wikitext = updated.wikitext;
            if (raceName) {
              wikitext = updateCorrectionText(wikitext, 2026, raceName, winnerCode);
            }
            
            return {
              template: temp,
              exists: true,
              changed: updated.changed,
              updates: updated.updates,
              wikitext: wikitext,
              currentWikitext: pageInfo.content
            };
          }));
          
          return corsResponse({ round, previewResults, verification: verificationReport });
        } catch (e: any) {
          return corsResponse({ error: e.message }, 500);
        }
      }

      // 8.6 Deploy Stats Templates
      if (url.pathname === '/api/publish-stats' && method === 'POST') {
        const body = await request.json() as any;
        const { 
          domain, username, password, 
          round, templatesToUpdate,
          turnstileToken
        } = body;

        const isTokenValid = await verifyTurnstile(turnstileToken, _env.TURNSTILE_SECRET_KEY, request);
        if (!isTokenValid) {
          return corsResponse({ error: 'CAPTCHA verification failed. Please try again.' }, 403);
        }

        if (!domain || !username || !password || !round || !templatesToUpdate) {
          return corsResponse({ error: 'Missing required parameters' }, 400);
        }

        try {
          const session = await loginToWiki({ 
            domain, username, botPassword: password,
            apiEndpoint: _env.WIKI_API_ENDPOINT,
            proxySecret: _env.PROXY_SECRET,
            kvState: _env.F1_WIKI_STATE
          });

          const rd = parseInt(round, 10);
          console.log(`Calculating cumulative stats up to round ${rd} for publishing...`);
          const cumulativeStats = await get2026CumulativeStats(_env, rd);

          // Get latest race info for correction text update
          const schedule = await getSchedule(2026);
          const race = schedule.find(r => parseInt(r.round, 10) === rd);
          const raceName = race ? race.raceName : '';
          
          let winnerCode = 'VER';
          try {
            const results = await getRaceResult(2026, rd, false);
            if (results.length > 0 && results[0].driver?.code) {
              winnerCode = results[0].driver.code;
            }
          } catch (e) {
            // ignore
          }

          const publishResults: any[] = [];

          for (const temp of templatesToUpdate) {
            const pageTitle = `Template:Stats/${temp}`;
            const pageInfo = await getPageContent(domain, pageTitle, undefined, _env.WIKI_API_ENDPOINT, _env.PROXY_SECRET, _env.F1_WIKI_STATE);
            
            if (!pageInfo.exists) {
              publishResults.push({ template: temp, status: 'Not found' });
              continue;
            }

            const updated = updateTemplateContent(temp, pageInfo.content, cumulativeStats);
            if (updated.changed) {
              let finalText = updated.wikitext;
              if (raceName) {
                finalText = updateCorrectionText(finalText, 2026, raceName, winnerCode);
              }
              
              await editPage(domain, session, pageTitle, finalText, `Automated stats update up to 2026 Round ${rd} (${raceName || `Round ${rd}`})`, _env.WIKI_API_ENDPOINT);
              publishResults.push({ template: temp, status: 'Updated' });
            } else {
              publishResults.push({ template: temp, status: 'No changes' });
            }
          }

          return corsResponse({ success: true, publishResults });
        } catch (e: any) {
          return corsResponse({ success: false, error: e.message }, 500);
        }
      }

      // 404 handler
      return corsResponse({ error: 'Not found' }, 404);

    } catch (e: any) {
      return corsResponse({ error: e.message }, 500);
    }
  },

  async scheduled(_event: any, env: any, _ctx: any): Promise<void> {
    console.log("Scheduled sync trigger fired!");

    // Check and send the daily proxy call summary email at 6 AM Pacific Time
    if (env.F1_WIKI_STATE && env.RESEND_API_KEY) {
      try {
        await checkAndSendDailySummary(env);
      } catch (e: any) {
        console.error("Daily summary email check failed:", e.message);
      }
    }

    const username = env.WIKI_BOT_USERNAME;
    const password = env.WIKI_BOT_PASSWORD;
    const domain = env.DEFAULT_WIKI_DOMAIN || "f1.fandom.com";
    const apiEndpoint = env.WIKI_API_ENDPOINT;
    const proxySecret = env.PROXY_SECRET;

    if (!username || !password) {
      console.error("Sync cancelled: Bot credentials (WIKI_BOT_USERNAME or WIKI_BOT_PASSWORD) not found in secrets.");
      return;
    }

    try {
      console.log("Fetching 2026 schedule from Jolpi...");
      const year = 2026;
      const schedule = await getSchedule(year);
      console.log(`Loaded schedule with ${schedule.length} rounds.`);

      // Lazy Fandom login helper to save proxy hits/emails (only login if we actually perform edits)
      let session: any = null;
      const getSession = async () => {
        if (!session) {
          console.log("Logging into Fandom via proxy...");
          session = await loginToWiki({
            domain,
            username,
            botPassword: password,
            apiEndpoint,
            proxySecret,
            kvState: env.F1_WIKI_STATE
          });
        }
        return session;
      };

      // --- Sync Latest F1 News/Events ---
      try {
        await syncLatestNewsEvents(env, getSession);
      } catch (e: any) {
        console.error("Failed to sync latest news/events template:", e.message);
      }

      // --- Sync Career Results Standings Templates ---
      try {
        await syncCareerStandingsTemplates(env, getSession);
      } catch (e: any) {
        console.error("Failed to sync Career Results standings templates:", e.message);
      }

      const now = new Date();

      // Filter to races that have concluded
      const concludedRaces = schedule.filter(race => {
        const gpTime = new Date(`${race.date}T${race.time || "12:00:00Z"}`);
        return now > gpTime;
      });

      // Sort concluded races by round descending (latest first)
      concludedRaces.sort((a, b) => parseInt(b.round, 10) - parseInt(a.round, 10));

      // Limit completed checking to only the last 2 completed rounds
      const completedRacesToProcess = concludedRaces.slice(0, 2);

      // Find the next upcoming/current race (ongoing race weekend)
      const nextRace = schedule.find(race => {
        const gpTime = new Date(`${race.date}T${race.time || "12:00:00Z"}`);
        return now <= gpTime;
      });

      // Combine completed and upcoming/ongoing race for processing, avoiding duplicates
      const racesToProcessMap = new Map<number, any>();
      completedRacesToProcess.forEach(r => racesToProcessMap.set(parseInt(r.round, 10), r));
      if (nextRace) {
        racesToProcessMap.set(parseInt(nextRace.round, 10), nextRace);
      }
      const racesToProcess = Array.from(racesToProcessMap.values());
      // Sort them by round so they are processed in order
      racesToProcess.sort((a, b) => parseInt(a.round, 10) - parseInt(b.round, 10));

      for (const race of racesToProcess) {
        const round = parseInt(race.round, 10);
        const raceName = race.raceName;

        // --- 1. Smart Check for Grand Prix ---
        const gpKey = `2026_round_${round}_gp_updated`;
        const gpUpdatedInKV = env.F1_WIKI_STATE ? await env.F1_WIKI_STATE.get(gpKey) === 'true' : false;
        const gpTime = new Date(`${race.date}T${race.time || "12:00:00Z"}`);
        const gpSessionCompleted = now > gpTime;

        if (gpUpdatedInKV) {
          console.log(`Round ${round} GP (${raceName}) already updated (KV cache). Skipping.`);
        } else if (!gpSessionCompleted) {
          console.log(`Round ${round} GP (${raceName}) not completed yet (scheduled: ${gpTime.toISOString()}). Skipping.`);
        } else {
          console.log(`Round ${round} GP has completed. Polling results from Jolpi...`);
          let gpResults: any[] = [];
          try {
            gpResults = await getRaceResult(year, round, false);
          } catch (e: any) {
            console.log(`  No GP results for round ${round} yet: ${e.message}`);
          }

          if (gpResults.length > 0) {
            const gpTitle = `Template:Career Results/${year} ${raceName}`;
            let gpWikitext = '';
            try {
              const pageInfo = await getPageContent(domain, gpTitle, undefined, apiEndpoint, proxySecret, env.F1_WIKI_STATE);
              if (pageInfo.exists) {
                gpWikitext = pageInfo.content;
              }
            } catch (e: any) {
              console.error(`  Error fetching GP template: ${e.message}`);
            }

            if (gpWikitext && isPlaceholder(gpWikitext)) {
              console.log(`  GP template is a placeholder. Auto-updating results...`);
              const currentSession = await getSession();
              const wikitext = generateWikiResultsText(gpResults, false);
              await editPage(domain, currentSession, gpTitle, wikitext, "Automated results update from Jolpi API", apiEndpoint);
              
              if (env.F1_WIKI_STATE) {
                await env.F1_WIKI_STATE.put(gpKey, 'true');
                console.log(`  Marked round ${round} GP as updated in KV.`);
              }
            } else if (gpWikitext) {
              console.log(`  GP template already has results on Fandom.`);
              if (env.F1_WIKI_STATE) {
                await env.F1_WIKI_STATE.put(gpKey, 'true');
                console.log(`  Marked round ${round} GP as updated in KV (found existing results on Fandom).`);
              }
            }
          }
        }

        // --- 2. Smart Check for Sprint ---
        if (race.Sprint) {
          const sprintName = raceName.replace("Grand Prix", "Sprint");
          const sprintKey = `2026_round_${round}_sprint_updated`;
          const sprintUpdatedInKV = env.F1_WIKI_STATE ? await env.F1_WIKI_STATE.get(sprintKey) === 'true' : false;
          const sprintTime = new Date(`${race.Sprint.date}T${race.Sprint.time || "12:00:00Z"}`);
          const sprintSessionCompleted = now > sprintTime;

          if (sprintUpdatedInKV) {
            console.log(`Round ${round} Sprint (${sprintName}) already updated (KV cache). Skipping.`);
          } else if (!sprintSessionCompleted) {
            console.log(`Round ${round} Sprint (${sprintName}) not completed yet (scheduled: ${sprintTime.toISOString()}). Skipping.`);
          } else {
            console.log(`Round ${round} Sprint has completed. Polling results from Jolpi...`);
            let sprintResults: any[] = [];
            try {
              sprintResults = await getRaceResult(year, round, true);
            } catch (e: any) {
              console.log(`  No Sprint results for round ${round} yet: ${e.message}`);
            }

            if (sprintResults.length > 0) {
              const sprintTitle = `Template:Career Results/${year} ${sprintName}`;
              let sprintWikitext = '';
              try {
                const pageInfo = await getPageContent(domain, sprintTitle, undefined, apiEndpoint, proxySecret, env.F1_WIKI_STATE);
                if (pageInfo.exists) {
                  sprintWikitext = pageInfo.content;
                }
              } catch (e: any) {
                console.error(`  Error fetching Sprint template: ${e.message}`);
              }

              if (sprintWikitext && isPlaceholder(sprintWikitext)) {
                console.log(`  Sprint template is a placeholder. Auto-updating results...`);
                const currentSession = await getSession();
                const wikitext = generateWikiResultsText(sprintResults, true);
                await editPage(domain, currentSession, sprintTitle, wikitext, "Automated Sprint results update from Jolpi API", apiEndpoint);
                
                if (env.F1_WIKI_STATE) {
                  await env.F1_WIKI_STATE.put(sprintKey, 'true');
                  console.log(`  Marked round ${round} Sprint as updated in KV.`);
                }
              } else if (sprintWikitext) {
                console.log(`  Sprint template already has results on Fandom.`);
                if (env.F1_WIKI_STATE) {
                  await env.F1_WIKI_STATE.put(sprintKey, 'true');
                  console.log(`  Marked round ${round} Sprint as updated in KV (found existing results on Fandom).`);
                }
              }
            }
          }
        }

        // --- 3. Smart Check for Stats Templates ---
        const statsKey = `2026_round_${round}_stats_synced`;
        const statsUpdatedInKV = env.F1_WIKI_STATE ? await env.F1_WIKI_STATE.get(statsKey) === 'true' : false;

        if (statsUpdatedInKV) {
          console.log(`Round ${round} Stats Templates already synced (KV cache). Skipping.`);
        } else if (!gpSessionCompleted) {
          console.log(`Round ${round} Stats Templates not completed yet. Skipping.`);
        } else {
          let hasGPResults = false;
          try {
            const gpResults = await getRaceResult(year, round, false);
            hasGPResults = gpResults.length > 0;
          } catch (e) {}

          if (hasGPResults) {
            console.log(`GP results available. Running stats sync for round ${round}...`);
            await syncStatsTemplates(env, getSession, round);
            
            if (env.F1_WIKI_STATE) {
              await env.F1_WIKI_STATE.put(statsKey, 'true');
              console.log(`Marked round ${round} Stats Templates as synced in KV.`);
            }
          }
        }

        // --- 4. Smart Check for GP Page Sections (Starting Grid, Qualifying, Sprint, Race Results, Standings) ---
        try {
          const gpPageTitle = `${year} ${raceName}`;
          console.log(`Checking GP page sections for: ${gpPageTitle}...`);
          
          const pageInfo = await getPageContent(domain, gpPageTitle, undefined, apiEndpoint, proxySecret, env.F1_WIKI_STATE);
          if (pageInfo.exists) {
            let currentContent = pageInfo.content;
            let updatedContent = currentContent;
            let changes: string[] = [];

            // 4a. Fetch necessary data from Jolpi/Ergast concurrently
            const [
              qualiResults,
              raceResults,
              currentDrivers,
              prevDrivers,
              currentConstructors,
              prevConstructors
            ] = await Promise.all([
              getQualifyingResult(year, round).catch(() => []),
              getRaceResult(year, round, false).catch(() => []),
              getDriverStandings(year, round).catch(() => []),
              round > 1 ? getDriverStandings(year, round - 1).catch(() => null) : Promise.resolve(null),
              getConstructorStandings(year, round).catch(() => []),
              round > 1 ? getConstructorStandings(year, round - 1).catch(() => null) : Promise.resolve(null),
            ]);

            let sprintResults: any[] = [];
            if (race.Sprint) {
              try {
                sprintResults = await getRaceResult(year, round, true);
              } catch (e) {
                // No sprint results yet
              }
            }

            // 4b. Update Qualifying Results and Starting Grid
            if (qualiResults && qualiResults.length > 0) {
              const qualifyingWikitext = generateQualifyingWikitext(qualiResults);
              const bestQualiHeader = findBestHeader(updatedContent, ["=== Qualifying Results ==="], "=== Qualifying Results ===");
              const newContent = replaceSectionWikitext(updatedContent, bestQualiHeader, qualifyingWikitext);
              if (newContent !== updatedContent) {
                updatedContent = newContent;
                changes.push("Qualifying Results");
              }

              const gridWikitext = generateGridWikitext(qualiResults);
              const bestGridHeader = findBestHeader(updatedContent, ["==== Starting Grid ====", "===Grid==="], "==== Starting Grid ====");
              const newGridContent = replaceSectionWikitext(updatedContent, bestGridHeader, gridWikitext);
              if (newGridContent !== updatedContent) {
                updatedContent = newGridContent;
                changes.push("Starting Grid");
              }
            }

            // 4c. Update Sprint Results
            if (race.Sprint && sprintResults && sprintResults.length > 0) {
              const sprintWikitext = generateRaceWikitext(sprintResults, true);
              const bestSprintHeader = findBestHeader(updatedContent, ["=== Sprint Results ==="], "=== Sprint Results ===");
              const newContent = replaceSectionWikitext(updatedContent, bestSprintHeader, sprintWikitext);
              if (newContent !== updatedContent) {
                updatedContent = newContent;
                changes.push("Sprint Results");
              }
            }

            // 4d. Update Race Results
            if (raceResults && raceResults.length > 0) {
              const raceWikitext = generateRaceWikitext(raceResults, false);
              const bestRaceHeader = findBestHeader(updatedContent, ["=== Race Results ===", "===Results==="], "=== Race Results ===");
              const newContent = replaceSectionWikitext(updatedContent, bestRaceHeader, raceWikitext);
              if (newContent !== updatedContent) {
                updatedContent = newContent;
                changes.push("Race Results");
              }
            }

            // 4e. Update Championship Standings
            if (currentDrivers && currentDrivers.length > 0 && currentConstructors && currentConstructors.length > 0) {
              const standingsWikitext = generateStandingsWikitext(
                currentDrivers,
                prevDrivers,
                currentConstructors,
                prevConstructors
              );
              const bestStandingsHeader = findBestHeader(updatedContent, ["== Standings ==", "==Standings=="], "== Standings ==");
              const newContent = replaceSectionWikitext(updatedContent, bestStandingsHeader, standingsWikitext);
              if (newContent !== updatedContent) {
                updatedContent = newContent;
                changes.push("Championship Standings");
              }
            }

            // If there are changes, save the page
            if (changes.length > 0) {
              console.log(`  Updating GP page sections for ${gpPageTitle}: ${changes.join(', ')}`);
              const currentSession = await getSession();
              await editPage(
                domain,
                currentSession,
                gpPageTitle,
                updatedContent,
                `Automated update of GP page sections: ${changes.join(', ')}`,
                apiEndpoint
              );
              console.log(`  Successfully updated ${gpPageTitle} sections!`);
            } else {
              console.log(`  No updates needed for GP page ${gpPageTitle} sections.`);
            }
          } else {
            console.log(`GP page ${gpPageTitle} does not exist on the wiki. Skipping section updates.`);
          }
        } catch (e: any) {
          console.error(`Error updating GP page sections for round ${round}:`, e.message);
        }
      }

      console.log("Scheduled sync completed successfully!");
    } catch (e: any) {
      console.error("Scheduled sync failed:", e.message);
    }
  }
};

// --- HELPER FUNCTIONS FOR SCHEDULED SYNC ---

function findBestHeader(fullText: string, options: string[], defaultHeader: string): string {
  for (const opt of options) {
    const escaped = opt.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    if (regex.test(fullText)) {
      return opt;
    }
  }
  return defaultHeader;
}



const wikiDriverList = [
  "Max Verstappen",
  "Isack Hadjar",
  "Charles Leclerc",
  "Lewis Hamilton",
  "George Russell",
  "Andrea Kimi Antonelli",
  "Pierre Gasly",
  "Franco Colapinto",
  "Lando Norris",
  "Oscar Piastri",
  "Carlos Sainz, Jr.",
  "Alexander Albon",
  "Liam Lawson",
  "Arvid Lindblad",
  "Lance Stroll",
  "Fernando Alonso",
  "Nico Hülkenberg",
  "Gabriel Bortoleto",
  "Esteban Ocon",
  "Oliver Bearman",
  "Valterri Bottas",
  "Sergio Pérez"
];

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatResult(r: any): string {
  const posText = r.positionText || r.position;
  let formatted = '';

  if (posText === 'R') {
    formatted = '{{Ret}}';
  } else if (posText === 'D') {
    formatted = '{{DSQ}}';
  } else if (posText === 'W') {
    formatted = '{{DNS}}';
  } else {
    const posVal = parseInt(r.position, 10);
    const ord = getOrdinal(posVal);
    const isFL = r.FastestLap && r.FastestLap.rank === '1';

    if (posVal <= 10) {
      formatted = isFL ? `{{${ord}|fl}}` : `{{${ord}}}`;
    } else {
      formatted = isFL ? `${ord}|fl` : `${ord}`;
    }
  }

  if (r.grid === '1') {
    formatted += '{{Pole}}';
  }

  return formatted;
}

function isPlaceholder(wikitext: string): boolean {
  const lines = wikitext.split('\n');
  for (const line of lines) {
    const match = line.match(/^\|([^=]+)=\s*(\S+)/);
    if (match && match[1].trim() !== '#default' && match[2].trim() !== '') {
      return false;
    }
  }
  return true;
}

function generateWikiResultsText(results: any[], _isSprint: boolean): string {
  const driverResultsMap: Record<string, string> = {};
  for (const r of results) {
    const wikiName = driverIdToWikiName[r.Driver.driverId];
    if (wikiName) {
      driverResultsMap[wikiName] = formatResult(r);
    }
  }

  let wikitext = '{{#switch:{{{1}}}\n';
  for (const wikiName of wikiDriverList) {
    const resultVal = driverResultsMap[wikiName] || '';
    const paddedName = wikiName.padEnd(22, ' ');
    wikitext += `|${paddedName} = ${resultVal}\n`;
  }
  wikitext += '|#default = \n';
  wikitext += '}}<noinclude>[[Category:2026 Results Templates]]</noinclude>';
  return wikitext;
}

async function checkAndSendDailySummary(env: any): Promise<void> {
  const kv = env.F1_WIKI_STATE;
  const resendApiKey = env.RESEND_API_KEY;
  if (!kv || !resendApiKey) return;

  // Get current date/time in America/Los_Angeles timezone (Pacific Time)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hourStr = parts.find(p => p.type === 'hour')?.value || '0';
  
  const pacificDateStr = `${year}-${month}-${day}`; // YYYY-MM-DD
  const pacificHour = parseInt(hourStr, 10);

  // We want to send the summary at 6 AM Pacific Time or later, if not sent today yet
  if (pacificHour >= 6) {
    const lastSentKey = 'last_summary_email_sent_date';
    const lastSentDate = await kv.get(lastSentKey);

    if (lastSentDate !== pacificDateStr) {
      console.log(`Sending daily API call summary for ${pacificDateStr} Pacific Time...`);
      
      const logsKey = 'proxy_daily_logs';
      const rawLogs = await kv.get(logsKey);
      const logs = rawLogs ? JSON.parse(rawLogs) : [];

      const totalCalls = logs.length;
      const succeededCalls = logs.filter((l: any) => l.success).length;
      const failedCalls = totalCalls - succeededCalls;
      const failedLogs = logs.filter((l: any) => !l.success);

      let failedSection = '';
      if (failedLogs.length > 0) {
        failedSection = `
          <h3 style="margin: 24px 0 12px 0; color: #dc2626; font-size: 16px; font-weight: 600;">Failure Log & Reasons</h3>
          <div style="border: 1px solid #fee2e2; border-radius: 8px; overflow: hidden; margin-bottom: 8px;">
            <table border="0" cellpadding="12" cellspacing="0" width="100%" style="font-size: 13px; text-align: left; border-collapse: collapse; width: 100%;">
              <thead>
                <tr style="background-color: #fef2f2; border-bottom: 1px solid #fee2e2;">
                  <th style="color: #991b1b; font-weight: 600; width: 25%; padding: 12px;">Action</th>
                  <th style="color: #991b1b; font-weight: 600; width: 15%; padding: 12px;">Method</th>
                  <th style="color: #991b1b; font-weight: 600; width: 60%; padding: 12px;">Reason for Failure</th>
                </tr>
              </thead>
              <tbody>
                ${failedLogs.map((l: any, idx: number) => `
                  <tr style="border-bottom: ${idx === failedLogs.length - 1 ? 'none' : '1px solid #fee2e2'};">
                    <td style="color: #1f2937; font-weight: 500; padding: 12px;">${l.action}</td>
                    <td style="color: #4b5563; padding: 12px;"><code style="font-family: monospace; background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px;">${l.method}</code></td>
                    <td style="color: #b91c1c; word-break: break-all; padding: 12px;">${l.errorReason || 'Unknown error'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } else {
        failedSection = `
          <div style="padding: 16px; background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; text-align: center; color: #065f46; font-size: 14px; font-weight: 500; margin-top: 16px;">
            ✓ All API calls completed successfully. No failures encountered.
          </div>
        `;
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>F1 Wiki Bot Daily Summary</title>
        </head>
        <body style="margin: 0; padding: 20px 0; background-color: #f6f8fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e1e4e8;">
            <!-- Header -->
            <tr>
              <td style="padding: 32px 24px; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">F1 Wiki Bot</h1>
                <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 14px;">Daily API Call Summary</p>
              </td>
            </tr>
            <!-- Content -->
            <tr>
              <td style="padding: 32px 24px;">
                <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 14px; text-align: right;"><strong>Date:</strong> ${pacificDateStr} (Pacific Time)</p>
                
                <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Executive Summary</h2>
                
                <!-- Stats Grid -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; width: 100%;">
                  <tr>
                    <td width="30%" style="padding: 16px; background-color: #f3f4f6; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb;">
                      <div style="color: #4b5563; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Attempted</div>
                      <div style="color: #1f2937; font-size: 28px; font-weight: 700; margin-top: 4px;">${totalCalls}</div>
                    </td>
                    <td width="5%"></td>
                    <td width="30%" style="padding: 16px; background-color: #ecfdf5; border-radius: 8px; text-align: center; border: 1px solid #d1fae5;">
                      <div style="color: #065f46; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Succeeded</div>
                      <div style="color: #059669; font-size: 28px; font-weight: 700; margin-top: 4px;">${succeededCalls}</div>
                    </td>
                    <td width="5%"></td>
                    <td width="30%" style="padding: 16px; background-color: ${failedCalls > 0 ? '#fef2f2' : '#f9fafb'}; border-radius: 8px; text-align: center; border: 1px solid ${failedCalls > 0 ? '#fee2e2' : '#f3f4f6'};">
                      <div style="color: ${failedCalls > 0 ? '#991b1b' : '#9ca3af'}; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Failed</div>
                      <div style="color: ${failedCalls > 0 ? '#dc2626' : '#9ca3af'}; font-size: 28px; font-weight: 700; margin-top: 4px;">${failedCalls}</div>
                    </td>
                  </tr>
                </table>

                <!-- Details Section -->
                ${failedSection}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="margin: 0; color: #9ca3af; font-size: 11px;">This is an automated report generated by the F1 Fandom Cloudflare Worker.</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // Send the email via Resend API
      const mailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "F1 Wiki Bot <onboarding@resend.dev>",
          to: "f1@christran.io",
          subject: `F1 Bot Daily API Summary - ${pacificDateStr}`,
          html: emailHtml
        })
      });

      if (mailRes.ok) {
        console.log("Daily summary email sent successfully!");
        // Update KV state to mark today as completed
        await kv.put(lastSentKey, pacificDateStr);
        // Clear logs for the next day
        await kv.delete(logsKey);
        console.log("Cleared API call logs in KV.");
      } else {
        console.error(`Failed to send daily summary email: ${mailRes.status} ${await mailRes.text()}`);
      }
    }
  }
}

async function syncLatestNewsEvents(env: any, getSession: () => Promise<any>): Promise<void> {
  const domain = env.DEFAULT_WIKI_DOMAIN || "f1.fandom.com";
  const apiEndpoint = env.WIKI_API_ENDPOINT;
  const proxySecret = env.PROXY_SECRET;

  console.log("Starting latest news events sync...");

  try {
    const currentYear = new Date().getFullYear();
    console.log(`Fetching schedules for ${currentYear - 1}, ${currentYear}, and ${currentYear + 1}...`);
    
    const [prevSchedule, currentSchedule, nextSchedule] = await Promise.all([
      getSchedule(currentYear - 1).catch(() => []),
      getSchedule(currentYear).catch(() => []),
      getSchedule(currentYear + 1).catch(() => [])
    ]);

    const mergedSchedule = [...prevSchedule, ...currentSchedule, ...nextSchedule];
    if (mergedSchedule.length === 0) {
      console.error("No races found in schedules. Skipping latest news events sync.");
      return;
    }

    const events: EventInfo[] = mergedSchedule.map(race => {
      const { startTime, endTime } = getRaceTimes(race);
      const year = race.season;
      const fullName = race.raceName;
      const name = race.raceName.replace(/\s+Grand\s+Prix/gi, "").trim();
      const startDateStr = getRaceStartDate(race);
      const endDateStr = race.date;

      return {
        year,
        name,
        fullName,
        dateRangeDesktop: formatDesktopDate(startDateStr, endDateStr),
        dateRangeMobile: formatMobileDate(startDateStr, endDateStr),
        startTime,
        endTime
      };
    });

    events.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());

    const now = new Date();
    const pastEvents = events.filter(e => e.endTime < now);
    const ongoingEvents = events.filter(e => e.startTime <= now && now <= e.endTime);
    const futureEvents = events.filter(e => now < e.startTime);

    let previousEvent: EventInfo | null = null;
    let latestEvent: EventInfo | null = null;
    let nextEvent: EventInfo | null = null;

    if (ongoingEvents.length > 0) {
      latestEvent = ongoingEvents[0];
      previousEvent = pastEvents[pastEvents.length - 1] || null;
      nextEvent = futureEvents[0] || null;
    } else {
      latestEvent = pastEvents[pastEvents.length - 1] || null;
      previousEvent = pastEvents[pastEvents.length - 2] || null;
      nextEvent = futureEvents[0] || null;
    }

    const isLatestOngoing = ongoingEvents.length > 0;

    console.log("Calculated events:", {
      previous: previousEvent ? `${previousEvent.year} ${previousEvent.fullName}` : 'None',
      latest: latestEvent ? `${latestEvent.year} ${latestEvent.fullName}` : 'None',
      next: nextEvent ? `${nextEvent.year} ${nextEvent.fullName}` : 'None',
      isLatestOngoing
    });

    const wikitext = generateLatestEventsWikitext(previousEvent, latestEvent, nextEvent, isLatestOngoing);
    const pageTitle = "Template:Latest_F1_News/Events";

    // Check if the current page content is identical
    console.log(`Checking current content of ${pageTitle}...`);
    const pageInfo = await getPageContent(domain, pageTitle, undefined, apiEndpoint, proxySecret, env.F1_WIKI_STATE);

    if (pageInfo.exists && pageInfo.content.trim() === wikitext.trim()) {
      console.log(`${pageTitle} is already up to date. Skipping edit.`);
      return;
    }

    console.log(`Content differs or page does not exist. Updating ${pageTitle}...`);
    const session = await getSession();
    await editPage(domain, session, pageTitle, wikitext, "Automated update of previous, latest, and next events", apiEndpoint);
    console.log(`Successfully updated ${pageTitle}!`);
  } catch (e: any) {
    console.error("Failed to sync latest news events:", e.message);
  }
}

function getRaceStartDate(race: any): string {
  if (race.FirstPractice && race.FirstPractice.date) {
    return race.FirstPractice.date;
  }
  // Fallback: 2 days before the race day
  const raceDate = new Date(race.date);
  raceDate.setUTCDate(raceDate.getUTCDate() - 2);
  const y = raceDate.getUTCFullYear();
  const m = String(raceDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(raceDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getRaceTimes(race: any): { startTime: Date; endTime: Date } {
  const startDateStr = getRaceStartDate(race);
  const startTimeStr = race.FirstPractice?.time || "00:00:00Z";
  const startTime = new Date(`${startDateStr}T${startTimeStr}`);
  const endTime = new Date(`${race.date}T23:59:59Z`);
  return { startTime, endTime };
}

async function syncCareerStandingsTemplates(env: any, getSession: () => Promise<any>): Promise<void> {
  const domain = env.DEFAULT_WIKI_DOMAIN || "f1.fandom.com";
  const apiEndpoint = env.WIKI_API_ENDPOINT;
  const proxySecret = env.PROXY_SECRET;

  console.log("Starting Career Results standings templates sync...");

  try {
    const year = 2026;
    console.log("Fetching latest standings from Jolpi API...");
    
    const [driverStandings, constructorStandings] = await Promise.all([
      getDriverStandings(year).catch(() => []),
      getConstructorStandings(year).catch(() => [])
    ]);

    if (driverStandings.length === 0 && constructorStandings.length === 0) {
      console.warn("Standings are empty. Skipping Career Results templates sync.");
      return;
    }

    // 1. Points template
    if (driverStandings.length > 0) {
      const pointsTitle = "Template:Career_Results/Points/2026";
      const pointsWikitext = generateCareerPointsWikitext(driverStandings);
      console.log(`Checking current content of ${pointsTitle}...`);
      const pointsPage = await getPageContent(domain, pointsTitle, undefined, apiEndpoint, proxySecret, env.F1_WIKI_STATE);
      if (!pointsPage.exists || pointsPage.content.trim() !== pointsWikitext.trim()) {
        console.log(`Content differs or page does not exist. Updating ${pointsTitle}...`);
        const session = await getSession();
        await editPage(domain, session, pointsTitle, pointsWikitext, "Automated update of driver career points template", apiEndpoint);
        console.log(`Successfully updated ${pointsTitle}!`);
      } else {
        console.log(`${pointsTitle} is already up to date.`);
      }
    }

    // 2. Position template
    if (driverStandings.length > 0) {
      const posTitle = "Template:Career_Results/Position/2026";
      const posWikitext = generateCareerPositionWikitext(driverStandings);
      console.log(`Checking current content of ${posTitle}...`);
      const posPage = await getPageContent(domain, posTitle, undefined, apiEndpoint, proxySecret, env.F1_WIKI_STATE);
      if (!posPage.exists || posPage.content.trim() !== posWikitext.trim()) {
        console.log(`Content differs or page does not exist. Updating ${posTitle}...`);
        const session = await getSession();
        await editPage(domain, session, posTitle, posWikitext, "Automated update of driver career positions template", apiEndpoint);
        console.log(`Successfully updated ${posTitle}!`);
      } else {
        console.log(`${posTitle} is already up to date.`);
      }
    }

    // 3. Team Position template
    if (constructorStandings.length > 0) {
      const teamTitle = "Template:Career_Results/Team_Position/2026";
      const teamWikitext = generateCareerTeamPositionWikitext(constructorStandings);
      console.log(`Checking current content of ${teamTitle}...`);
      const teamPage = await getPageContent(domain, teamTitle, undefined, apiEndpoint, proxySecret, env.F1_WIKI_STATE);
      if (!teamPage.exists || teamPage.content.trim() !== teamWikitext.trim()) {
        console.log(`Content differs or page does not exist. Updating ${teamTitle}...`);
        const session = await getSession();
        await editPage(domain, session, teamTitle, teamWikitext, "Automated update of constructor career positions template", apiEndpoint);
        console.log(`Successfully updated ${teamTitle}!`);
      } else {
        console.log(`${teamTitle} is already up to date.`);
      }
    }

  } catch (e: any) {
    console.error("Failed to sync Career Results standings templates:", e.message);
  }
}

async function syncStatsTemplates(env: any, getSession: () => Promise<any>, round: number): Promise<void> {
  const domain = env.DEFAULT_WIKI_DOMAIN || "f1.fandom.com";
  const apiEndpoint = env.WIKI_API_ENDPOINT;
  const proxySecret = env.PROXY_SECRET;

  console.log(`Starting scheduled Stats Templates sync for round ${round}...`);

  try {
    const cumulativeStats = await get2026CumulativeStats(env, round);
    
    // Get latest race info for correction text update
    const schedule = await getSchedule(2026);
    const race = schedule.find(r => parseInt(r.round, 10) === round);
    const raceName = race ? race.raceName : '';
    
    // Try to get winner of the race for the correction code
    let winnerCode = 'VER'; // default fallback
    try {
      const results = await getRaceResult(2026, round, false);
      if (results.length > 0 && results[0].driver?.code) {
        winnerCode = results[0].driver.code;
      }
    } catch (e) {
      // ignore
    }

    const templates = [
      "Championships", "Distance", "DistanceLed", "Doubles", "Entries",
      "FastestLaps", "FrontRows", "Grand Chelems", "HatTricks", "Laps",
      "LapsLed", "Podiums", "Points", "Poles", "RacesLed",
      "SprintFastestLaps", "SprintPodiums", "SprintPoles", "SprintWins", "Starts", "Wins"
    ];

    let session: any = null;
    const getSessionLocal = async () => {
      if (!session) {
        session = await getSession();
      }
      return session;
    };

    for (const temp of templates) {
      const pageTitle = `Template:Stats/${temp}`;
      const pageInfo = await getPageContent(domain, pageTitle, undefined, apiEndpoint, proxySecret, env.F1_WIKI_STATE).catch(() => ({ exists: false, content: '' }));
      
      if (!pageInfo.exists) {
        console.warn(`Template ${pageTitle} does not exist. Skipping.`);
        continue;
      }

      const updated = updateTemplateContent(temp, pageInfo.content, cumulativeStats);
      if (updated.changed) {
        let finalText = updated.wikitext;
        if (raceName) {
          finalText = updateCorrectionText(finalText, 2026, raceName, winnerCode);
        }
        
        console.log(`Updating ${pageTitle} on Fandom...`);
        const currentSession = await getSessionLocal();
        await editPage(domain, currentSession, pageTitle, finalText, `Automated stats update up to 2026 Round ${round} (${raceName || `Round ${round}`})`, apiEndpoint);
        console.log(`Successfully updated ${pageTitle}!`);
      } else {
        console.log(`${pageTitle} is already up to date.`);
      }
    }
  } catch (e: any) {
    console.error(`Scheduled stats templates sync failed: ${e.message}`);
  }
}

