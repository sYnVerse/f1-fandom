import { PracticeSessionData } from './f1-api';

const SESSION_ARTICLE_KEYWORDS: Record<string, string[]> = {
  'FP1': ['fp1', 'free-practice-1', 'first-practice', 'practice-1', 'practice-one', 'free-practice-one'],
  'FP2': ['fp2', 'free-practice-2', 'second-practice', 'practice-2', 'practice-two', 'free-practice-two'],
  'FP3': ['fp3', 'free-practice-3', 'third-practice', 'practice-3', 'practice-three', 'free-practice-three'],
};

export async function appendKvWarning(kv: any, key: string, message: string): Promise<void> {
  if (!kv) return;
  const raw = await kv.get(key);
  const warnings: string[] = raw ? JSON.parse(raw) : [];
  warnings.push(message);
  await kv.put(key, JSON.stringify(warnings));
}

export async function logCrawlerFailure(kv: any, message: string): Promise<void> {
  await appendKvWarning(kv, 'f1_crawler_failures', message);
}

function formatPracticeSessionContext(
  label: string,
  results: Record<string, PracticeSessionData> | null
): string {
  if (!results || Object.keys(results).length === 0) return '';
  let section = `### ${label} Results:\n`;
  const sorted = Object.values(results).sort(
    (a, b) => parseInt(a.position, 10) - parseInt(b.position, 10)
  );
  for (const r of sorted) {
    section += `Pos ${r.position}: No. ${r.number} ${r.driverName} (${r.teamName}) - Time: ${r.time}\n`;
  }
  return section + '\n';
}

export function generatePromptContext(
  race: any,
  drivers: any[],
  standings: {
    driverStandings?: any[];
    constructorStandings?: any[];
  },
  qualiResults: any[],
  sprintResults: any[],
  raceResults: any[],
  practiceResults?: {
    fp1?: Record<string, PracticeSessionData> | null;
    fp2?: Record<string, PracticeSessionData> | null;
    fp3?: Record<string, PracticeSessionData> | null;
  }
): string {
  let context = `Race: ${race.season} Round ${race.round} - ${race.raceName}\n`;
  context += `Circuit: ${race.Circuit.circuitName} in ${race.Circuit.Location.locality}, ${race.Circuit.Location.country}\n\n`;

  if (drivers && drivers.length > 0) {
    context += `### Entry List (Drivers and Teams):\n`;
    drivers.forEach(d => {
      context += `- No. ${d.permanentNumber || 'TBA'}: ${d.givenName} ${d.familyName} (${d.nationality})\n`;
    });
    context += `\n`;
  }

  if (practiceResults) {
    context += formatPracticeSessionContext('FP1', practiceResults.fp1 ?? null);
    context += formatPracticeSessionContext('FP2', practiceResults.fp2 ?? null);
    context += formatPracticeSessionContext('FP3', practiceResults.fp3 ?? null);
  }

  if (standings.driverStandings && standings.driverStandings.length > 0) {
    context += `### Driver Championship Standings (Pre-Race):\n`;
    standings.driverStandings.slice(0, 10).forEach((s, idx) => {
      context += `${idx + 1}. ${s.Driver.givenName} ${s.Driver.familyName}: ${s.points} pts\n`;
    });
    context += `\n`;
  }

  if (qualiResults && qualiResults.length > 0) {
    context += `### Qualifying Results:\n`;
    qualiResults.forEach((q, idx) => {
      const time = q.Q3 || q.Q2 || q.Q1 || 'No Time';
      context += `Pos ${idx + 1}: No. ${q.number} ${q.driver.givenName} ${q.driver.familyName} (${q.constructor.name}) - Time: ${time}\n`;
    });
    context += `\n`;
  }

  if (sprintResults && sprintResults.length > 0) {
    context += `### Sprint Race Results:\n`;
    sprintResults.forEach((r, idx) => {
      context += `Pos ${idx + 1}: No. ${r.number} ${r.driver.givenName} ${r.driver.familyName} (${r.constructor.name}) - Points: ${r.points}\n`;
    });
    context += `\n`;
  }

  if (raceResults && raceResults.length > 0) {
    context += `### Main Race Results:\n`;
    raceResults.forEach((r, idx) => {
      const timeStr = r.Time ? r.Time.time : r.status;
      context += `Pos ${idx + 1}: No. ${r.number} ${r.driver.givenName} ${r.driver.familyName} (${r.constructor.name}) - Time/Status: ${timeStr}, Points: ${r.points}\n`;
    });
    const fl = raceResults.find(r => r.FastestLap && r.FastestLap.rank === '1');
    if (fl && fl.FastestLap) {
      context += `Fastest Lap: No. ${fl.number} ${fl.driver.givenName} ${fl.driver.familyName} - Time: ${fl.FastestLap.Time.time} on lap ${fl.FastestLap.lap}\n`;
    }
    context += `\n`;
  }

  return context;
}

export function getPromptForSection(sectionName: string, context: string): string {
  const baseInstructions = `You are a professional F1 sports journalist writing content for the F1 Fandom Wiki.
Based on the provided race weekend data context, write a factual, neutral, and detailed section titled "${sectionName}" for the Grand Prix article.
Follow these rules strictly:
- Do NOT output any headings, titles, intro text, or markdown decorators like "Here is the section:". Output ONLY the wikitext content of the section.
- Use standard Wikipedia/Wikitext formatting:
  - Link driver names on their first occurrence using double square brackets, e.g., [[Max Verstappen]] or [[Carlos Sainz, Jr.]] (make sure to use correct wiki names).
  - Use wikitext flags and templates where appropriate.
  - Link constructor names, e.g., [[McLaren]], [[Scuderia Ferrari|Ferrari]], [[Red Bull Racing|Red Bull]], etc.
  - Do NOT invent or hallucinate any details. Rely ONLY on the provided session results and facts.
- Keep the tone encyclopedic, concise, and professional. Write 1 to 3 paragraphs depending on the detail needed.`;

  let sectionInstructions = "";
  const nameLower = sectionName.toLowerCase();

  if (nameLower === "background") {
    sectionInstructions = `
The "Background" section should describe:
- The context of the race in the season (e.g. which round of the championship it is, who is leading the championship).
- Any driver lineup changes or entry list updates based on the entries.
- Focus on the pre-race championship narrative and context.`;
  } else if (nameLower === "fp1" || nameLower === "fp2" || nameLower === "fp3") {
    sectionInstructions = `
The "${sectionName}" section should summarize this free practice session:
- Mention the fastest times and top performers.
- Highlight any incidents, spins, mechanical issues, or driver feedback reported in the official session context.
- Note any notable team or tyre performance trends visible from the results.
- Describe any test driver appearances if relevant.`;
  } else if (nameLower === "q1" || nameLower === "q2" || nameLower === "q3" || nameLower.includes("qualifying")) {
    sectionInstructions = `
The "${sectionName}" section should summarize the events and eliminations in this segment of qualifying:
- Mention the top times and drivers.
- List which drivers were eliminated in this session and the gap or circumstances, if visible.
- Highlight the battle at the cutoff zone.`;
  } else if (nameLower === "sprint report" || nameLower === "sprint") {
    sectionInstructions = `
The "Sprint Report" section should summarize the Sprint race:
- The starting lineup / pole.
- The key position changes, the winner, and podium finishers (top 3) or points scorers (top 8).
- Any retirements or significant incidents.`;
  } else if (nameLower === "race report" || nameLower === "race") {
    sectionInstructions = `
The "Race Report" section should summarize the main Grand Prix race:
- Mention the winner, second, and third place finishers.
- Describe the key battles, position changes, or strategy highlights (if implied by grid vs finish).
- Detail who set the fastest lap.
- List any retirements and the reason/status if provided in the results.`;
  }

  return `${baseInstructions}\n${sectionInstructions}\n\n### Race Weekend Data Context:\n${context}`;
}

function extractArticleLinks(html: string): string[] {
  const links: string[] = [];
  const linkRegex = /href="(\/en\/latest\/article\/[^"]+)"/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const path = match[1];
    if (!links.includes(path)) {
      links.push(path);
    }
  }
  return links;
}

function scoreArticleRelevance(slug: string, sessionName: string): number {
  const keywords = SESSION_ARTICLE_KEYWORDS[sessionName] || [];
  const slugLower = slug.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (slugLower.includes(kw)) score += 2;
  }
  if (slugLower.includes('lap-by-lap') || slugLower.includes('report')) score += 1;
  return score;
}

export function stripHtmlTags(input: string): string {
  let prev: string;
  let result = input;
  do {
    prev = result;
    result = result.replace(/<[^>]*>/g, '');
  } while (result !== prev);
  return result.replace(/</g, '').replace(/>/g, '');
}

function extractArticleText(html: string): string {
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*class="[^"]*f1-paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pRegex.exec(html)) !== null) {
    const text = stripHtmlTags(match[1]).replace(/\s+/g, ' ').trim();
    if (text.length > 20) paragraphs.push(text);
  }

  if (paragraphs.length === 0) {
    const genericRegex = /<article[^>]*>([\s\S]*?)<\/article>/i;
    const articleMatch = html.match(genericRegex);
    if (articleMatch) {
      const genericPRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pMatch;
      while ((pMatch = genericPRegex.exec(articleMatch[1])) !== null) {
        const text = stripHtmlTags(pMatch[1]).replace(/\s+/g, ' ').trim();
        if (text.length > 20) paragraphs.push(text);
      }
    }
  }

  return paragraphs.join('\n\n');
}

export async function fetchF1comSessionArticle(
  year: number,
  racingKey: string,
  sessionName: string
): Promise<string> {
  const racePageUrl = `https://www.formula1.com/en/racing/${year}/${racingKey}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const raceRes = await fetch(racePageUrl, { headers });
  if (!raceRes.ok) {
    throw new Error(`Failed to fetch F1.com race page (${racePageUrl}): HTTP ${raceRes.status}`);
  }

  const raceHtml = await raceRes.text();
  const articleLinks = extractArticleLinks(raceHtml);

  if (articleLinks.length === 0) {
    throw new Error(`No article links found on F1.com race page for ${racingKey}`);
  }

  const ranked = articleLinks
    .map(link => ({ link, score: scoreArticleRelevance(link, sessionName) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    throw new Error(`No relevant ${sessionName} article found on F1.com race page for ${racingKey}`);
  }

  const articleUrl = `https://www.formula1.com${ranked[0].link}`;
  const articleRes = await fetch(articleUrl, { headers });
  if (!articleRes.ok) {
    throw new Error(`Failed to fetch F1.com article (${articleUrl}): HTTP ${articleRes.status}`);
  }

  const articleHtml = await articleRes.text();
  const text = extractArticleText(articleHtml);
  if (!text) {
    throw new Error(`No article text extracted from ${articleUrl}`);
  }

  return text;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ]
    })
  });
  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json() as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini API");
  return text.trim();
}

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const url = "https://api.openai.com/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    })
  });
  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json() as any;
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenAI API");
  return text.trim();
}

async function callWorkersAI(aiBinding: any, prompt: string): Promise<string> {
  if (!aiBinding) throw new Error("Cloudflare AI binding not available");
  const response = await aiBinding.run("@cf/meta/llama-3-8b-instruct", {
    messages: [
      { role: "user", content: prompt }
    ]
  }) as any;
  const text = response.response;
  if (!text) throw new Error("Empty response from Workers AI");
  return text.trim();
}

export async function generateReportForSection(
  env: any,
  sectionName: string,
  promptContext: string,
  options?: {
    year?: number;
    racingKey?: string;
    sessionName?: string;
  }
): Promise<string> {
  let enrichedContext = promptContext;

  if (options?.year && options?.racingKey && options?.sessionName) {
    try {
      const articleText = await fetchF1comSessionArticle(
        options.year,
        options.racingKey,
        options.sessionName
      );
      enrichedContext += `\n### Official F1.com ${options.sessionName} Article:\n${articleText}\n`;
    } catch (e: any) {
      const warning = `Failed to crawl F1.com ${options.sessionName} article for ${options.racingKey} (${options.year}): ${e.message}`;
      console.warn(warning);
      await logCrawlerFailure(env.F1_WIKI_STATE, warning);
    }
  }

  const prompt = getPromptForSection(sectionName, enrichedContext);

  const provider = env.LLM_PROVIDER || (env.GEMINI_API_KEY ? "gemini" : env.OPENAI_API_KEY ? "openai" : "workers-ai");
  const providersToTry = [provider];

  const allProviders = ["gemini", "openai", "workers-ai"];
  allProviders.forEach(p => {
    if (!providersToTry.includes(p)) {
      providersToTry.push(p);
    }
  });

  let lastError: Error | null = null;
  for (const p of providersToTry) {
    try {
      console.log(`Attempting to generate report for ${sectionName} using provider: ${p}`);
      if (p === "gemini") {
        if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
        return await callGemini(env.GEMINI_API_KEY, prompt);
      } else if (p === "openai") {
        if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
        return await callOpenAI(env.OPENAI_API_KEY, prompt);
      } else if (p === "workers-ai") {
        if (!env.AI) throw new Error("Workers AI binding not set");
        return await callWorkersAI(env.AI, prompt);
      }
    } catch (e: any) {
      console.error(`Provider ${p} failed: ${e.message}`);
      lastError = e;
    }
  }

  throw new Error(`All LLM providers failed. Last error: ${lastError ? lastError.message : "Unknown"}`);
}
