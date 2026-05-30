import { frontendHtml } from './frontend-html';
import { 
  getSchedule, 
  getRaceResult, 
  getQualifyingResult, 
  getDriverStandings, 
  getConstructorStandings,
  getDriversForRace,
  scrapePracticeSession,
  parsePracticeHTML,
  mapDriverNames
} from './f1-api';
import { 
  generateGridWikitext, 
  generateQualifyingWikitext, 
  generateRaceWikitext, 
  generateStandingsWikitext,
  generatePracticeWikitext 
} from './wikitext-generator';
import { 
  loginToWiki, 
  getPageContent, 
  editPage, 
  replaceSectionWikitext 
} from './wiki';

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
        return new Response(frontendHtml, {
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
          getDriversForRace(year, round),
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
        const { year, round, url: fp1Url, pastedHtml, fallbackOnly } = body;

        if (!year || !round) {
          return corsResponse({ error: 'Year and round parameters required' }, 400);
        }

        const yr = parseInt(year, 10);
        const rd = parseInt(round, 10);

        const drivers = await getDriversForRace(yr, rd);
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

        const pageInfo = await getPageContent(domain, title);
        return corsResponse({ exists: pageInfo.exists });
      }

      // 6. Fetch Page Content
      if (url.pathname === '/api/wiki-content' && method === 'POST') {
        const body = await request.json() as any;
        const { domain, title } = body;
        if (!domain || !title) return corsResponse({ error: 'Domain and title required' }, 400);

        const pageInfo = await getPageContent(domain, title);
        return corsResponse({ exists: pageInfo.exists, content: pageInfo.content });
      }

      // 7. Test Login Connection
      if (url.pathname === '/api/wiki-login-test' && method === 'POST') {
        const body = await request.json() as any;
        const { domain, username, password } = body;
        if (!domain || !username || !password) {
          return corsResponse({ error: 'Domain, username, and password required' }, 400);
        }

        try {
          await loginToWiki({ domain, username, botPassword: password });
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
          sectionHeader, currentFullText 
        } = body;

        if (!domain || !username || !password || !title || !text) {
          return corsResponse({ error: 'Missing required parameters' }, 400);
        }

        try {
          const session = await loginToWiki({ domain, username, botPassword: password });
          
          let finalText = text;
          if (sectionHeader) {
            // Edit section logic
            const baseText = currentFullText || '';
            finalText = replaceSectionWikitext(baseText, sectionHeader, text);
          }

          await editPage(domain, session, title, finalText, summary || 'Bot edit');
          return corsResponse({ success: true });
        } catch (e: any) {
          return corsResponse({ success: false, error: e.message }, 500);
        }
      }

      // 404 handler
      return corsResponse({ error: 'Not found' }, 404);

    } catch (e: any) {
      return corsResponse({ error: e.message }, 500);
    }
  }
};
