export interface WikiConfig {
  domain: string; // e.g. f1.fandom.com
  username: string;
  botPassword?: string; // BotPassword generated on Special:BotPasswords
  apiEndpoint?: string; // Optional proxy endpoint url
  proxySecret?: string; // Optional secret token for proxy
  kvState?: any; // Cloudflare KV state binding for logging
}

export interface WikiSession {
  cookies: string;
  csrfToken: string;
  proxySecret?: string;
  kvState?: any;
}

// Get the MediaWiki API URL
function getApiUrl(domain: string, apiEndpoint?: string): string {
  if (apiEndpoint) {
    return apiEndpoint;
  }
  // Ensure protocol is present
  const cleanDomain = domain.replace(/^(https?:\/\/)?/, 'https://');
  return `${cleanDomain}/api.php`;
}

// Helper to log wiki API calls into Cloudflare KV
async function logApiCall(
  kv: any,
  action: string,
  method: string,
  url: string,
  success: boolean,
  errorReason?: string
): Promise<void> {
  if (!kv) return;

  try {
    const logsKey = 'proxy_daily_logs';
    const rawLogs = await kv.get(logsKey);
    const logs = rawLogs ? JSON.parse(rawLogs) : [];

    logs.push({
      action,
      method,
      url,
      success,
      errorReason: errorReason || null,
      timestamp: new Date().toISOString()
    });

    await kv.put(logsKey, JSON.stringify(logs));
  } catch (e: any) {
    console.error("Failed to log wiki API call in KV:", e.message);
  }
}

// Log in and return session cookies and CSRF token
export async function loginToWiki(config: WikiConfig): Promise<WikiSession> {
  const apiUrl = getApiUrl(config.domain, config.apiEndpoint);
  const username = config.username;
  const password = config.botPassword || '';

  if (!username || !password) {
    throw new Error('Bot username or password not provided.');
  }

  // Step 1: Get Login Token
  const tokenUrl = `${apiUrl}?action=query&meta=tokens&type=login&format=json`;
  const tokenHeaders: Record<string, string> = {};
  if (config.proxySecret) {
    tokenHeaders['X-Proxy-Secret'] = config.proxySecret;
  }

  let tokenSuccess = false;
  let tokenErrorReason = '';
  let tokenRes;

  try {
    tokenRes = await fetch(tokenUrl, { headers: tokenHeaders });
    tokenSuccess = tokenRes.ok;
    if (!tokenRes.ok) {
      tokenErrorReason = `HTTP ${tokenRes.status}`;
    }
  } catch (e: any) {
    tokenErrorReason = e.message;
    throw e;
  } finally {
    if (config.kvState) {
      await logApiCall(config.kvState, 'Get Login Token', 'GET', tokenUrl, tokenSuccess, tokenErrorReason);
    }
  }

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text().catch(() => '');
    throw new Error(`Get login token request failed (HTTP ${tokenRes.status}): ${errorText}`);
  }

  const tokenData = await tokenRes.json() as any;
  const loginToken = tokenData?.query?.tokens?.logintoken;
  if (!loginToken) {
    throw new Error(`Login token not found in MediaWiki response. Response: ${JSON.stringify(tokenData)}`);
  }

  // Get cookies from token response if any (some wikis set cookies on token request)
  let cookies = '';
  if (typeof (tokenRes.headers as any).getSetCookie === 'function') {
    cookies = (tokenRes.headers as any).getSetCookie()
      .map((c: string) => c.split(';')[0])
      .join('; ');
  } else {
    const setCookie = tokenRes.headers.get('set-cookie');
    if (setCookie) cookies = setCookie.split(';')[0];
  }

  // Step 2: Submit Credentials
  const loginParams = new URLSearchParams();
  loginParams.append('action', 'login');
  loginParams.append('lgname', username);
  loginParams.append('lgpassword', password);
  loginParams.append('lgtoken', loginToken);
  loginParams.append('format', 'json');

  const loginHeaders: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': cookies,
  };
  if (config.proxySecret) {
    loginHeaders['X-Proxy-Secret'] = config.proxySecret;
  }

  let loginSuccess = false;
  let loginErrorReason = '';
  let loginRes;

  try {
    loginRes = await fetch(apiUrl, {
      method: 'POST',
      headers: loginHeaders,
      body: loginParams.toString(),
    });
    loginSuccess = loginRes.ok;
    if (!loginRes.ok) {
      loginErrorReason = `HTTP ${loginRes.status}`;
    } else {
      const data = await loginRes.clone().json() as any;
      if (data?.login?.result !== 'Success') {
        loginSuccess = false;
        loginErrorReason = data?.login?.reason || data?.login?.result;
      }
    }
  } catch (e: any) {
    loginErrorReason = e.message;
    throw e;
  } finally {
    if (config.kvState) {
      await logApiCall(config.kvState, 'Submit Bot Credentials', 'POST', apiUrl, loginSuccess, loginErrorReason);
    }
  }

  if (!loginRes.ok) {
    const errorText = await loginRes.text().catch(() => '');
    throw new Error(`Bot credentials submission failed (HTTP ${loginRes.status}): ${errorText}`);
  }

  const loginData = await loginRes.json() as any;
  if (loginData?.login?.result !== 'Success') {
    throw new Error(`Wiki login failed: ${loginData?.login?.reason || loginData?.login?.result || JSON.stringify(loginData)}`);
  }

  // Append new cookies from login response
  let loginCookies = '';
  if (typeof (loginRes.headers as any).getSetCookie === 'function') {
    loginCookies = (loginRes.headers as any).getSetCookie()
      .map((c: string) => c.split(';')[0])
      .join('; ');
  } else {
    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) loginCookies = setCookie.split(';')[0];
  }
  cookies = [cookies, loginCookies].filter(Boolean).join('; ');

  // Step 3: Get CSRF Token
  const csrfUrl = `${apiUrl}?action=query&meta=tokens&type=csrf&format=json`;
  const csrfHeaders: Record<string, string> = {
    'Cookie': cookies,
  };
  if (config.proxySecret) {
    csrfHeaders['X-Proxy-Secret'] = config.proxySecret;
  }

  let csrfSuccess = false;
  let csrfErrorReason = '';
  let csrfRes;

  try {
    csrfRes = await fetch(csrfUrl, {
      headers: csrfHeaders
    });
    csrfSuccess = csrfRes.ok;
    if (!csrfRes.ok) {
      csrfErrorReason = `HTTP ${csrfRes.status}`;
    }
  } catch (e: any) {
    csrfErrorReason = e.message;
    throw e;
  } finally {
    if (config.kvState) {
      await logApiCall(config.kvState, 'Get CSRF Token', 'GET', csrfUrl, csrfSuccess, csrfErrorReason);
    }
  }

  if (!csrfRes.ok) {
    const errorText = await csrfRes.text().catch(() => '');
    throw new Error(`Get CSRF token request failed (HTTP ${csrfRes.status}): ${errorText}`);
  }

  const csrfData = await csrfRes.json() as any;
  const csrfToken = csrfData?.query?.tokens?.csrftoken;
  if (!csrfToken) {
    throw new Error(`CSRF token not found in MediaWiki response. Response: ${JSON.stringify(csrfData)}`);
  }

  return { 
    cookies, 
    csrfToken, 
    proxySecret: config.proxySecret, 
    kvState: config.kvState 
  };
}

export interface WikiPageContent {
  exists: boolean;
  content: string;
  pageId: number;
}

// Fetch the page content
export async function getPageContent(
  domain: string,
  title: string,
  cookies?: string,
  apiEndpoint?: string,
  proxySecret?: string,
  _kvState?: any
): Promise<WikiPageContent> {
  const apiUrl = getApiUrl(domain, apiEndpoint);
  const params = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    titles: title,
    rvprop: 'content',
    format: 'json',
  });

  const headers: Record<string, string> = {};
  if (cookies) {
    headers['Cookie'] = cookies;
  }
  if (proxySecret) {
    headers['X-Proxy-Secret'] = proxySecret;
  }

  const res = await fetch(`${apiUrl}?${params.toString()}`, { headers });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Get page content request failed (HTTP ${res.status}): ${errorText}`);
  }

  const data = await res.json() as any;
  const pages = data?.query?.pages;
  if (!pages) {
    return { exists: false, content: '', pageId: -1 };
  }

  const pageId = Object.keys(pages)[0];
  if (pageId === '-1') {
    return { exists: false, content: '', pageId: -1 };
  }

  const page = pages[pageId];
  const content = page?.revisions?.[0]?.['*'] || '';

  return { exists: true, content, pageId: parseInt(pageId, 10) };
}

// Edit a wiki page (whole page or section replacement)
export async function editPage(
  domain: string,
  session: WikiSession,
  title: string,
  text: string,
  summary: string,
  apiEndpoint?: string
): Promise<void> {
  const apiUrl = getApiUrl(domain, apiEndpoint);
  const editParams = new URLSearchParams();
  editParams.append('action', 'edit');
  editParams.append('title', title);
  editParams.append('text', text);
  editParams.append('summary', summary);
  editParams.append('token', session.csrfToken);
  editParams.append('format', 'json');
  editParams.append('bot', '1'); // mark as bot edit

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': session.cookies,
  };
  if (session.proxySecret) {
    headers['X-Proxy-Secret'] = session.proxySecret;
  }

  let success = false;
  let errorReason = '';
  let res;

  try {
    res = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: editParams.toString(),
    });
    success = res.ok;
    if (!res.ok) {
      errorReason = `HTTP ${res.status}`;
    } else {
      const editData = await res.clone().json() as any;
      if (editData?.edit?.result !== 'Success') {
        success = false;
        errorReason = editData?.edit?.reason || JSON.stringify(editData?.error || editData?.edit);
      }
    }
  } catch (e: any) {
    errorReason = e.message;
    throw e;
  } finally {
    if (session.kvState) {
      await logApiCall(session.kvState, `Edit Page: ${title}`, 'POST', apiUrl, success, errorReason);
    }
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Edit page request failed (HTTP ${res.status}): ${errorText}`);
  }

  const editData = await res.json() as any;
  if (editData?.edit?.result !== 'Success') {
    throw new Error(`Wiki edit failed: ${editData?.edit?.reason || JSON.stringify(editData?.error || editData?.edit)}`);
  }
}

export function replaceSectionWikitext(fullText: string, header: string, newContent: string): string {
  // Clean up whitespace
  const cleanHeader = header.trim();
  const match = cleanHeader.match(/^(=+)\s*(.*?)\s*(=+)$/);
  
  let regex: RegExp;
  let levelNum = 2;
  let name = cleanHeader;
  
  if (match) {
    levelNum = match[1].length;
    name = match[2].trim();
    const escapedName = name
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
      .replace(/\s+/g, '\\s+');
    
    // Matches the heading on its own line: preceding boundary/newline ($1), heading line ($2), and section content ($3)
    regex = new RegExp(`(^|\\r?\\n)([ \\t]*={${levelNum}}\\s*${escapedName}\\s*={${levelNum}}[ \\t]*(?:\\r?\\n|$))([\\s\\S]*?)(?=\\r?\\n==+|$)`, 'gi');
  } else {
    const escapedHeader = cleanHeader.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    regex = new RegExp(`(^|\\r?\\n)(${escapedHeader}\\s*[\\r\\n]+)([\\s\\S]*?)(?=\\r?\\n==+|$)`, 'gi');
  }

  // Strip any leading heading from newContent to avoid duplicate headings
  const strippedContent = newContent.replace(/^\s*={1,6}\s*.*?\s*={1,6}\s*(?:\r?\n|$)/, '').trim();

  // Find all matches for the section
  const matches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  regex.lastIndex = 0;
  while ((m = regex.exec(fullText)) !== null) {
    matches.push(m);
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  if (matches.length > 0) {
    // Reconstruct the text: replace the first occurrence, delete any duplicate occurrences
    let result = '';
    let lastIndex = 0;
    
    for (let i = 0; i < matches.length; i++) {
      const matchObj = matches[i];
      const matchIndex = matchObj.index;
      const matchLength = matchObj[0].length;
      
      // Append text before this match
      result += fullText.slice(lastIndex, matchIndex);
      
      if (i === 0) {
        // First match: replace its content with the new content
        const prefix = matchObj[1];
        const headingLine = matchObj[2];
        result += `${prefix}${headingLine}${strippedContent}\n\n`;
      } else {
        // Subsequent matches: duplicate sections, remove them completely
        console.log(`Removing duplicate section heading: "${matchObj[2].trim()}"`);
      }
      
      lastIndex = matchIndex + matchLength;
    }
    
    // Append remaining text
    result += fullText.slice(lastIndex);
    return result;
  } else {
    // Section not found, append to the end of the page
    return `${fullText.trim()}\n\n${cleanHeader}\n${strippedContent}\n`;
  }
}

