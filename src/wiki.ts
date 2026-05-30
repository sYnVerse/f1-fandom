export interface WikiConfig {
  domain: string; // e.g. f1.fandom.com
  username: string;
  botPassword?: string; // BotPassword generated on Special:BotPasswords
}

export interface WikiSession {
  cookies: string;
  csrfToken: string;
}

// Get the MediaWiki API URL
function getApiUrl(domain: string): string {
  // Ensure protocol is present
  const cleanDomain = domain.replace(/^(https?:\/\/)?/, 'https://');
  return `${cleanDomain}/api.php`;
}

// Log in and return session cookies and CSRF token
export async function loginToWiki(config: WikiConfig): Promise<WikiSession> {
  const apiUrl = getApiUrl(config.domain);
  const username = config.username;
  const password = config.botPassword || '';

  if (!username || !password) {
    throw new Error('Bot username or password not provided.');
  }

  // Step 1: Get Login Token
  const tokenUrl = `${apiUrl}?action=query&meta=tokens&type=login&format=json&origin=*`;
  const tokenRes = await fetch(tokenUrl);
  if (!tokenRes.ok) {
    throw new Error(`Failed to get login token: HTTP ${tokenRes.status}`);
  }
  const tokenData = await tokenRes.json() as any;
  const loginToken = tokenData?.query?.tokens?.logintoken;
  if (!loginToken) {
    throw new Error('Login token not found in MediaWiki response.');
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

  const loginRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies,
    },
    body: loginParams.toString(),
  });

  if (!loginRes.ok) {
    throw new Error(`Failed login request: HTTP ${loginRes.status}`);
  }

  const loginData = await loginRes.json() as any;
  if (loginData?.login?.result !== 'Success') {
    throw new Error(`Wiki login failed: ${loginData?.login?.reason || loginData?.login?.result}`);
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
  const csrfRes = await fetch(csrfUrl, {
    headers: {
      'Cookie': cookies,
    }
  });

  if (!csrfRes.ok) {
    throw new Error(`Failed to fetch CSRF token: HTTP ${csrfRes.status}`);
  }

  const csrfData = await csrfRes.json() as any;
  const csrfToken = csrfData?.query?.tokens?.csrftoken;
  if (!csrfToken) {
    throw new Error('CSRF token not found in MediaWiki response.');
  }

  return { cookies, csrfToken };
}

export interface WikiPageContent {
  exists: boolean;
  content: string;
  pageId: number;
}

// Fetch the page content
export async function getPageContent(domain: string, title: string, cookies?: string): Promise<WikiPageContent> {
  const apiUrl = getApiUrl(domain);
  const params = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    titles: title,
    rvprop: 'content',
    format: 'json',
    origin: '*',
  });

  const headers: Record<string, string> = {};
  if (cookies) {
    headers['Cookie'] = cookies;
  }

  const res = await fetch(`${apiUrl}?${params.toString()}`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch page content: HTTP ${res.status}`);
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
  summary: string
): Promise<void> {
  const apiUrl = getApiUrl(domain);
  const editParams = new URLSearchParams();
  editParams.append('action', 'edit');
  editParams.append('title', title);
  editParams.append('text', text);
  editParams.append('summary', summary);
  editParams.append('token', session.csrfToken);
  editParams.append('format', 'json');
  editParams.append('bot', '1'); // mark as bot edit

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': session.cookies,
    },
    body: editParams.toString(),
  });

  if (!res.ok) {
    throw new Error(`Failed edit request: HTTP ${res.status}`);
  }

  const editData = await res.json() as any;
  if (editData?.edit?.result !== 'Success') {
    throw new Error(`Wiki edit failed: ${editData?.edit?.reason || JSON.stringify(editData?.error || editData?.edit)}`);
  }
}

// Safe section replacement helper
export function replaceSectionWikitext(fullText: string, header: string, newContent: string): string {
  // Clean up whitespace
  const cleanHeader = header.trim();
  // Escape header for regex
  const escapedHeader = cleanHeader.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  
  // Regex: matches the header, then matching everything up until next header starting with "\n==" or end of file
  const regex = new RegExp(`(${escapedHeader}\\s*[\\r\\n]+)([\\s\\S]*?)(?=\\r?\\n==|$)`, 'i');
  
  if (regex.test(fullText)) {
    return fullText.replace(regex, `$1${newContent.trim()}\n\n`);
  } else {
    // Section not found, append to the end of the page
    return `${fullText.trim()}\n\n${cleanHeader}\n${newContent.trim()}\n`;
  }
}
