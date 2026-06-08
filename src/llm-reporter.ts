export function generatePromptContext(
  race: any,
  drivers: any[],
  standings: {
    driverStandings?: any[];
    constructorStandings?: any[];
  },
  qualiResults: any[],
  sprintResults: any[],
  raceResults: any[]
): string {
  let context = `Race: ${race.season} Round ${race.round} - ${race.raceName}\n`;
  context += `Circuit: ${race.Circuit.circuitName} in ${race.Circuit.Location.locality}, ${race.Circuit.Location.country}\n\n`;

  // 1. Entry List
  if (drivers && drivers.length > 0) {
    context += `### Entry List (Drivers and Teams):\n`;
    drivers.forEach(d => {
      context += `- No. ${d.permanentNumber || 'TBA'}: ${d.givenName} ${d.familyName} (${d.nationality})\n`;
    });
    context += `\n`;
  }

  // 2. Standings
  if (standings.driverStandings && standings.driverStandings.length > 0) {
    context += `### Driver Championship Standings (Pre-Race):\n`;
    standings.driverStandings.slice(0, 10).forEach((s, idx) => {
      context += `${idx + 1}. ${s.Driver.givenName} ${s.Driver.familyName}: ${s.points} pts\n`;
    });
    context += `\n`;
  }

  // 3. Qualifying Results
  if (qualiResults && qualiResults.length > 0) {
    context += `### Qualifying Results:\n`;
    qualiResults.forEach((q, idx) => {
      const time = q.Q3 || q.Q2 || q.Q1 || 'No Time';
      context += `Pos ${idx + 1}: No. ${q.number} ${q.driver.givenName} ${q.driver.familyName} (${q.constructor.name}) - Time: ${time}\n`;
    });
    context += `\n`;
  }

  // 4. Sprint Results
  if (sprintResults && sprintResults.length > 0) {
    context += `### Sprint Race Results:\n`;
    sprintResults.forEach((r, idx) => {
      context += `Pos ${idx + 1}: No. ${r.number} ${r.driver.givenName} ${r.driver.familyName} (${r.constructor.name}) - Points: ${r.points}\n`;
    });
    context += `\n`;
  }

  // 5. Race Results
  if (raceResults && raceResults.length > 0) {
    context += `### Main Race Results:\n`;
    raceResults.forEach((r, idx) => {
      const timeStr = r.Time ? r.Time.time : r.status;
      context += `Pos ${idx + 1}: No. ${r.number} ${r.driver.givenName} ${r.driver.familyName} (${r.constructor.name}) - Time/Status: ${timeStr}, Points: ${r.points}\n`;
    });
    // Add fastest lap if available
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

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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

export async function generateReportForSection(env: any, sectionName: string, promptContext: string): Promise<string> {
  const prompt = getPromptForSection(sectionName, promptContext);
  
  // Determine preferred provider priority
  const provider = env.LLM_PROVIDER || (env.GEMINI_API_KEY ? "gemini" : env.OPENAI_API_KEY ? "openai" : "workers-ai");
  const providersToTry = [provider];
  
  // Fill fallback chain
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
