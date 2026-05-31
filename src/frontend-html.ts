export const frontendHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>F1 Wiki Automator - Cloudflare Dashboard</title>
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  
  <!-- Modern CSS Styles -->
  <style>
    :root {
      --bg-dark: #0a0a0c;
      --bg-card: #121216;
      --border-color: rgba(255, 255, 255, 0.08);
      --border-color-hover: rgba(225, 6, 0, 0.3);
      --text-main: #e2e2e9;
      --text-muted: #8d8d9f;
      --accent-f1: #e10600;
      --accent-glow: rgba(225, 6, 0, 0.5);
      --accent-secondary: #00f0ff;
      --success: #00ff66;
      --warning: #ffaa00;
      --error: #ff3333;
      --font-family: 'Inter', sans-serif;
      --font-heading: 'Outfit', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: var(--font-family);
      line-height: 1.6;
      overflow-x: hidden;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(225, 6, 0, 0.04) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(0, 240, 255, 0.03) 0%, transparent 40%);
    }

    /* Container */
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px 40px;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .f1-badge {
      background-color: var(--accent-f1);
      color: white;
      font-family: var(--font-heading);
      font-weight: 800;
      font-size: 1.2rem;
      padding: 4px 10px;
      border-radius: 4px;
      letter-spacing: -1px;
      box-shadow: 0 0 15px var(--accent-glow);
      text-transform: uppercase;
      transform: skewX(-10deg);
    }

    h1 {
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 1.8rem;
      letter-spacing: -0.5px;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      color: var(--text-muted);
      background-color: rgba(255, 255, 255, 0.03);
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid var(--border-color);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--warning);
      box-shadow: 0 0 8px var(--warning);
    }

    .status-dot.online {
      background-color: var(--success);
      box-shadow: 0 0 8px var(--success);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .support-btn {
      display: inline-flex;
      align-items: center;
      background-color: rgba(0, 240, 255, 0.08);
      border: 1px solid var(--accent-secondary);
      color: var(--accent-secondary);
      font-size: 0.9rem;
      font-weight: 600;
      padding: 6px 16px;
      border-radius: 20px;
      text-decoration: none;
      transition: all 0.3s ease;
    }

    .support-btn:hover {
      background-color: var(--accent-secondary);
      color: #000;
      box-shadow: 0 0 12px rgba(0, 240, 255, 0.4);
      transform: translateY(-1px);
    }

    /* Grid Layout */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 30px;
      align-items: start;
    }

    /* Sidebar Settings Panel */
    .settings-panel {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
    }

    .settings-panel h2 {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      margin-bottom: 20px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-group {
      margin-bottom: 18px;
    }

    .form-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-control {
      width: 100%;
      background-color: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 10px 12px;
      color: #fff;
      font-family: var(--font-family);
      font-size: 0.95rem;
      transition: all 0.2s ease;
    }

    /* Style option elements inside dropdown selects to prevent white box with white text issue */
    select.form-control option {
      background-color: var(--bg-card);
      color: #fff;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--accent-f1);
      box-shadow: 0 0 8px rgba(225, 6, 0, 0.25);
      background-color: rgba(255, 255, 255, 0.05);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 6px;
      font-family: var(--font-family);
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid transparent;
      width: 100%;
    }

    .btn-primary {
      background-color: var(--accent-f1);
      color: #fff;
      box-shadow: 0 4px 15px rgba(225, 6, 0, 0.3);
    }

    .btn-primary:hover {
      background-color: #ff1a1a;
      box-shadow: 0 4px 20px rgba(225, 6, 0, 0.5);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background-color: transparent;
      border-color: var(--border-color);
      color: var(--text-main);
    }

    .btn-secondary:hover {
      border-color: #fff;
      background-color: rgba(255, 255, 255, 0.03);
    }

    .btn-accent {
      background-color: transparent;
      border-color: var(--accent-secondary);
      color: var(--accent-secondary);
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.1);
    }

    .btn-accent:hover {
      background-color: rgba(0, 240, 255, 0.05);
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
    }

    /* Main Console Workspace */
    .workspace {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }

    .panel {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
    }

    /* Control Bar */
    .control-bar {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      align-items: flex-end;
    }

    .control-bar .form-group {
      margin-bottom: 0;
      flex: 1;
      min-width: 150px;
    }

    /* Tabs System */
    .tab-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .tabs-nav {
      display: flex;
      gap: 10px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1px;
      overflow-x: auto;
    }

    .tab-btn {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 10px 16px;
      color: var(--text-muted);
      font-weight: 500;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      font-family: var(--font-heading);
    }

    .tab-btn:hover {
      color: var(--text-main);
    }

    .tab-btn.active {
      color: var(--accent-f1);
      border-color: var(--accent-f1);
      font-weight: 600;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    /* Workspace Content Areas */
    .editor-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 15px;
    }

    @media (max-width: 1100px) {
      .editor-section {
        grid-template-columns: 1fr;
      }
    }

    .editor-box {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .editor-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .wikitext-textarea {
      width: 100%;
      height: 350px;
      background-color: #060608;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 15px;
      color: #00ff66;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      resize: vertical;
      line-height: 1.5;
    }

    .wikitext-textarea:focus {
      outline: none;
      border-color: var(--border-color-hover);
    }

    /* Practice Manual Fallback Box */
    .fallback-box {
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px dashed var(--border-color);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .fallback-box h3 {
      font-size: 1rem;
      margin-bottom: 8px;
      color: var(--warning);
    }

    .fallback-box p {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 12px;
    }

    /* Page Checker & Status Box */
    .wiki-status-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 15px 20px;
      margin-bottom: 10px;
    }

    .wiki-status-details h4 {
      font-size: 1.05rem;
      font-family: var(--font-heading);
      margin-bottom: 4px;
    }

    .wiki-status-details p {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .status-badge.missing {
      background-color: rgba(255, 51, 51, 0.15);
      color: var(--error);
      border: 1px solid rgba(255, 51, 51, 0.3);
    }

    .status-badge.exists {
      background-color: rgba(0, 255, 102, 0.15);
      color: var(--success);
      border: 1px solid rgba(0, 255, 102, 0.3);
    }

    /* Terminal Console */
    .terminal-console {
      background-color: #050507;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 15px;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      height: 180px;
      overflow-y: auto;
      box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
    }

    .console-line {
      margin-bottom: 6px;
      word-break: break-all;
    }

    .console-time {
      color: var(--text-muted);
      margin-right: 8px;
    }

    .console-info {
      color: #fff;
    }

    .console-success {
      color: var(--success);
    }

    .console-warning {
      color: var(--warning);
    }

    .console-error {
      color: var(--error);
    }

    /* Footer styling */
    footer {
      text-align: center;
      margin-top: 50px;
      padding: 20px 0;
      color: var(--text-muted);
      font-size: 0.8rem;
      border-top: 1px solid var(--border-color);
    }

    .badge-fandom {
      color: #00f0ff;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Top Header -->
    <header>
      <div class="logo-area">
        <div class="f1-badge">F1 Wiki</div>
        <h1>Automator Dashboard</h1>
      </div>
      <div class="header-actions">
        <a href="https://f1.fandom.com/wiki/Message_Wall:SYnVerse" target="_blank" class="support-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: middle;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>Support Wall
        </a>
        <div class="connection-status">
          <div class="status-dot" id="status-dot"></div>
          <span id="status-text">Checking Wiki Connection...</span>
        </div>
      </div>
    </header>

    <!-- Main Grid -->
    <div class="dashboard-grid">
      
      <!-- Side Configuration Panel -->
      <aside class="settings-panel">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          Bot Credentials
        </h2>
        <div class="form-group">
          <label for="wiki-domain">Wiki Domain</label>
          <input type="text" id="wiki-domain" class="form-control" value="f1.fandom.com">
        </div>
        <div class="form-group">
          <label for="bot-username">Username@Suffix</label>
          <input type="text" id="bot-username" class="form-control" placeholder="BotAccount@Automator" autocomplete="username">
        </div>
        <div class="form-group">
          <label for="bot-password">Bot Password</label>
          <input type="password" id="bot-password" class="form-control" placeholder="••••••••••••••••" autocomplete="current-password">
        </div>
        <div class="form-group">
          <label for="sandbox-page">Draft/Sandbox Page</label>
          <input type="text" id="sandbox-page" class="form-control" placeholder="User:Username/Sandbox">
        </div>
        <button class="btn btn-secondary" style="margin-bottom: 12px;" onclick="testWikiConnection()">Test Bot Connection</button>
        <button class="btn btn-accent" onclick="saveCredentials()">Save Credentials (Local)</button>
      </aside>

      <!-- Main Workspace -->
      <main class="workspace">
        
        <!-- Selection Bar -->
        <section class="panel">
          <div class="control-bar">
            <div class="form-group">
              <label for="season-year">Season Year</label>
              <select id="season-year" class="form-control" onchange="loadSchedule()">
                <option value="2026">2026 Season</option>
                <option value="2025">2025 Season</option>
                <option value="2024" selected>2024 Season</option>
                <option value="2023">2023 Season</option>
                <option value="2022">2022 Season</option>
                <option value="2021">2021 Season</option>
              </select>
            </div>
            <div class="form-group" style="flex: 2;">
              <label for="race-round">Grand Prix Round</label>
              <select id="race-round" class="form-control" onchange="updatePageStatusBanner()">
                <option value="">Loading Grand Prix list...</option>
              </select>
            </div>
            <div>
              <button class="btn btn-primary" onclick="fetchF1Data()">Fetch GP Data</button>
            </div>
          </div>
        </section>

        <!-- Page Checker Banner -->
        <section class="wiki-status-banner" id="status-banner" style="display: none;">
          <div class="wiki-status-details">
            <h4 id="wiki-page-title">Page: --</h4>
            <p id="wiki-page-url">Url: --</p>
          </div>
          <div class="status-badge missing" id="wiki-status-badge">Missing</div>
        </section>

        <!-- Main Workspace Panels -->
        <section class="panel tab-container">
          <div class="tabs-nav">
            <button class="tab-btn active" onclick="switchTab(event, 'tab-practice')">Practice</button>
            <button class="tab-btn" onclick="switchTab(event, 'tab-grid')">Starting Grid</button>
            <button class="tab-btn" onclick="switchTab(event, 'tab-quali')">Qualifying</button>
            <button class="tab-btn" onclick="switchTab(event, 'tab-sprint')">Sprint</button>
            <button class="tab-btn" onclick="switchTab(event, 'tab-race')">Race Results</button>
            <button class="tab-btn" onclick="switchTab(event, 'tab-standings')">World Standings</button>
          </div>

          <!-- Practice Panel -->
          <div class="tab-content active" id="tab-practice">
            <div class="fallback-box">
              <h3>F1.com Scraper Credentials & Fallback</h3>
              <p>If the auto-fetch practice tables are blocked by Cloudflare (DNP shown), open F1.com practice session result page in your browser, right click, inspect / copy the table HTML, and paste it below.</p>
              <div class="form-group" style="margin-bottom: 12px;">
                <label for="practice-url-input">F1.com Practice URL</label>
                <input type="text" id="practice-url-input" class="form-control" placeholder="https://www.formula1.com/en/results/2024/races/1243/monaco/practice/1">
              </div>
              <textarea id="practice-html-input" class="form-control" style="height: 80px; font-family: monospace; font-size: 0.8rem; margin-bottom: 12px;" placeholder="Paste <table> or <tr> HTML here..."></textarea>
              <div style="display: flex; gap: 10px;">
                <button class="btn btn-secondary" onclick="scrapePracticeSessionAPI()">Auto Scrape via API</button>
                <button class="btn btn-accent" onclick="parsePastedPracticeHTML()">Parse Pasted HTML</button>
              </div>
            </div>
            
            <div class="editor-section">
              <div class="editor-box">
                <div class="editor-header">
                  <span class="editor-title">Generated Wikitext</span>
                  <button class="btn btn-secondary" style="width: auto; padding: 4px 10px; font-size: 0.8rem;" onclick="copyToClipboard('practice-wikitext')">Copy</button>
                </div>
                <textarea id="practice-wikitext" class="wikitext-textarea" placeholder="Wikitext will appear here..."></textarea>
              </div>
              <div class="editor-box">
                <div class="editor-header">
                  <span class="editor-title">Wiki Action</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                  <p style="font-size: 0.9rem; color: var(--text-muted);">This action replaces or appends the <strong>===Practice Results===</strong> section in the target Grand Prix wiki page.</p>
                  <button class="btn btn-primary" onclick="publishSection('===Practice Results===', 'practice-wikitext')">Publish Practice Section</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Grid Panel -->
          <div class="tab-content" id="tab-grid">
            <div class="editor-section">
              <div class="editor-box">
                <div class="editor-header">
                  <span class="editor-title">Generated Wikitext</span>
                  <button class="btn btn-secondary" style="width: auto; padding: 4px 10px; font-size: 0.8rem;" onclick="copyToClipboard('grid-wikitext')">Copy</button>
                </div>
                <textarea id="grid-wikitext" class="wikitext-textarea" placeholder="Wikitext will appear here..."></textarea>
              </div>
              <div class="editor-box">
                <div class="editor-header">
                  <span class="editor-title">Wiki Action</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                  <p style="font-size: 0.9rem; color: var(--text-muted);">This action replaces or appends the <strong>===Grid===</strong> section in the target Grand Prix wiki page.</p>
                  <button class="btn btn-primary" onclick="publishSection('===Grid===', 'grid-wikitext')">Publish Grid Section</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Qualifying Panel -->
          <div class="tab-content" id="tab-quali">
            <div class="editor-section">
              <div class="editor-box">
                <div class="editor-header">
                  <span class="editor-title">Generated Wikitext</span>
                  <button class="btn btn-secondary" style="width: auto; padding: 4px 10px; font-size: 0.8rem;" onclick="copyToClipboard('quali-wikitext')">Copy</button>
                </div>
                <textarea id="quali-wikitext" class="wikitext-textarea" placeholder="Wikitext will appear here..."></textarea>
              </div>
              <div class="editor-box">
                <div class="editor-header">
                  <span class="editor-title">Wiki Action</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                  <p style="font-size: 0.9rem; color: var(--text-muted);">This action replaces or appends the <strong>===Qualifying Results===</strong> section in the target Grand Prix wiki page.</p>
                  <button class="btn btn-primary" onclick="publishSection('===Qualifying Results===', 'quali-wikitext')">Publish Qualifying Section</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sprint Panel -->
          <div class="tab-content" id="tab-sprint">
            <div class="editor-section">
              <div class="editor-box">
                <div class="editor-header">
                  <span class="editor-title">Generated Wikitext</span>
                  <button class="btn btn-secondary" style="width: auto; padding: 4px 10px; font-size: 0.8rem;" onclick="copyToClipboard('sprint-wikitext')">Copy</button>
                </div>
                <textarea id="sprint-wikitext" class="wikitext-textarea" placeholder="Wikitext will appear here..."></textarea>
              </div>
              <div class="editor-box">
                <div class="editor-header">
                  <span class="editor-title">Wiki Action</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                  <p style="font-size: 0.9rem; color: var(--text-muted);">This action replaces or appends the <strong>===Sprint Results===</strong> section in the target Grand Prix wiki page.</p>
                  <button class="btn btn-primary" onclick="publishSection('===Sprint Results===', 'sprint-wikitext')">Publish Sprint Section</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Race Results Panel -->
          <div class="tab-content" id="tab-race">
            <div class="editor-section">
              <div class="editor-box">
                <div class="editor-header">
                  <span class="editor-title">Generated Wikitext</span>
                  <button class="btn btn-secondary" style="width: auto; padding: 4px 10px; font-size: 0.8rem;" onclick="copyToClipboard('race-wikitext')">Copy</button>
                </div>
                <textarea id="race-wikitext" class="wikitext-textarea" placeholder="Wikitext will appear here..."></textarea>
              </div>
              <div class="editor-box">
                <div class="editor-header">
                  <span class="editor-title">Wiki Action</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                  <p style="font-size: 0.9rem; color: var(--text-muted);">This action replaces or appends the <strong>===Results===</strong> section in the target Grand Prix wiki page.</p>
                  <button class="btn btn-primary" onclick="publishSection('===Results===', 'race-wikitext')">Publish Race Results Section</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Standings Panel -->
          <div class="tab-content" id="tab-standings">
            <div class="editor-section">
              <div class="editor-box">
                <div class="editor-header">
                  <span class="editor-title">Generated Wikitext</span>
                  <button class="btn btn-secondary" style="width: auto; padding: 4px 10px; font-size: 0.8rem;" onclick="copyToClipboard('standings-wikitext')">Copy</button>
                </div>
                <textarea id="standings-wikitext" class="wikitext-textarea" placeholder="Wikitext will appear here..."></textarea>
              </div>
              <div class="editor-box">
                <div class="editor-header">
                  <span class="editor-title">Wiki Action</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                  <p style="font-size: 0.9rem; color: var(--text-muted);">This action replaces or appends the <strong>==Standings==</strong> section in the target Grand Prix wiki page.</p>
                  <button class="btn btn-primary" onclick="publishSection('==Standings==', 'standings-wikitext')">Publish Standings Section</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Entire Page Sync Panel -->
        <section class="panel">
          <h2>Full Page Editor & Deployment</h2>
          <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 15px;">
            <p style="font-size: 0.95rem; color: var(--text-muted);">
              You can publish all sections together, or write a custom document. Below, check the current content of the page, modify it, and submit the entire text.
            </p>
            <div style="display: flex; gap: 15px;">
              <button class="btn btn-secondary" onclick="fetchWikiPageWikitext()" style="width: auto;">Fetch Current Wiki Page</button>
              <button class="btn btn-secondary" onclick="testSandboxEdit()" style="width: auto; border-color: var(--accent-secondary); color: var(--accent-secondary);">Perform Test Edit on Sandbox</button>
            </div>
            <textarea id="wiki-full-page-editor" class="wikitext-textarea" style="height: 400px; color: #fff;" placeholder="Wiki Page source code will be loaded here..."></textarea>
            <div>
              <button class="btn btn-primary" onclick="publishFullPage()" style="width: auto; padding: 12px 30px;">Deploy Full Page Content</button>
            </div>
          </div>
        </section>

        <!-- Console logs -->
        <section class="panel">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h2 style="margin-bottom: 0;">Execution Console Logs</h2>
            <button class="btn btn-secondary" style="width: auto; padding: 2px 10px; font-size: 0.8rem;" onclick="clearConsole()">Clear</button>
          </div>
          <div class="terminal-console" id="console">
            <div class="console-line"><span class="console-time">[--:--:--]</span> <span class="console-info">Dashboard initialized. Enter Bot Credentials in the sidebar and fetch Grand Prix data.</span></div>
          </div>
        </section>
      </main>
    </div>

    <!-- Footer -->
    <footer>
      <p>F1 Wiki Automator App • Designed for admins of <a href="https://f1.fandom.com" target="_blank" class="badge-fandom">f1.fandom.com</a> • Powered by Cloudflare Workers</p>
    </footer>
  </div>

  <script>
    // Local storage key management
    const STORAGE_KEY = 'f1_wiki_credentials';
    let f1Schedule = [];
    let currentGPRace = null;
    let driversList = [];
    let practiceScrapedFP1 = null;
    let practiceScrapedFP2 = null;
    let practiceScrapedFP3 = null;

    // Load saved settings
    window.addEventListener('DOMContentLoaded', () => {
      loadCredentials();
      loadSchedule();
    });

    function log(message, type = 'info') {
      const consoleElement = document.getElementById('console');
      const line = document.createElement('div');
      line.className = 'console-line';
      
      const timeSpan = document.createElement('span');
      timeSpan.className = 'console-time';
      const now = new Date();
      timeSpan.textContent = \`[\${now.toTimeString().split(' ')[0]}]\`;
      
      const textSpan = document.createElement('span');
      textSpan.className = \`console-\${type}\`;
      textSpan.textContent = message;
      
      line.appendChild(timeSpan);
      line.appendChild(textSpan);
      consoleElement.appendChild(line);
      consoleElement.scrollTop = consoleElement.scrollHeight;
    }

    function clearConsole() {
      document.getElementById('console').innerHTML = '';
      log('Console cleared.', 'info');
    }

    function saveCredentials() {
      const wikiDomain = document.getElementById('wiki-domain').value;
      const botUsername = document.getElementById('bot-username').value;
      const botPassword = document.getElementById('bot-password').value;
      const sandboxPage = document.getElementById('sandbox-page').value;

      const creds = { wikiDomain, botUsername, botPassword, sandboxPage };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
      log('Credentials saved securely to local storage.', 'success');
      testWikiConnection();
    }

    function loadCredentials() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const creds = JSON.parse(raw);
          document.getElementById('wiki-domain').value = creds.wikiDomain || 'f1.fandom.com';
          document.getElementById('bot-username').value = creds.botUsername || '';
          document.getElementById('bot-password').value = creds.botPassword || '';
          document.getElementById('sandbox-page').value = creds.sandboxPage || '';
          log('Credentials loaded from local storage.', 'info');
        } catch (e) {
          log('Failed to parse saved credentials.', 'error');
        }
      }
    }

    // Tab switching logic
    function switchTab(evt, tabId) {
      const tabContents = document.getElementsByClassName('tab-content');
      for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
      }
      
      const tabBtns = document.getElementsByClassName('tab-btn');
      for (let i = 0; i < tabBtns.length; i++) {
        tabBtns[i].classList.remove('active');
      }

      document.getElementById(tabId).classList.add('active');
      evt.currentTarget.classList.add('active');
    }

    // Copy to clipboard
    function copyToClipboard(id) {
      const copyText = document.getElementById(id);
      copyText.select();
      copyText.setSelectionRange(0, 99999);
      navigator.clipboard.writeText(copyText.value)
        .then(() => log(\`Copied wikitext from \${id} to clipboard!\`, 'success'))
        .catch(() => log('Failed to copy to clipboard.', 'error'));
    }

    // Load GP list based on selected season
    async function loadSchedule() {
      const year = document.getElementById('season-year').value;
      log(\`Loading F1 race schedule for season \${year}...\`, 'info');
      
      try {
        const res = await fetch(\`/api/schedule?year=\${year}\`);
        if (!res.ok) throw new Error(\`Failed to fetch schedule: \${res.statusText}\`);
        const data = await res.json();
        
        f1Schedule = data.schedule || [];
        log(\`Loaded \${f1Schedule.length} rounds for season \${year}.\`, 'success');
        
        const dropdown = document.getElementById('race-round');
        dropdown.innerHTML = '';
        
        if (f1Schedule.length === 0) {
          dropdown.innerHTML = '<option value="">No rounds found</option>';
          return;
        }

        f1Schedule.forEach(race => {
          const opt = document.createElement('option');
          opt.value = race.round;
          opt.textContent = \`Round \${race.round}: \${race.raceName} (\${race.Circuit.Location.locality}, \${race.Circuit.Location.country})\`;
          dropdown.appendChild(opt);
        });

        // Pre-fill practice URL suggestion
        updatePracticeURLSuggestion();
        updatePageStatusBanner();
      } catch (e) {
        log(\`Error loading schedule: \${e.message}\`, 'error');
      }
    }

    function updatePracticeURLSuggestion() {
      const year = document.getElementById('season-year').value;
      const dropdown = document.getElementById('race-round');
      const round = dropdown.value;
      
      if (!round || f1Schedule.length === 0) return;

      const race = f1Schedule.find(r => r.round === round);
      if (!race) return;

      const raceNameLower = race.raceName.toLowerCase().replace(/[\s_]+/g, '-');
      let circuitId = race.Circuit.circuitId.replace(/[\s_-]+/g, '_');
      
      const raceIdMapping = {
        'hungaroring': '1266', 'silverstone': '1267', 'monaco': '1268', 'spa': '1269',
        'monza': '1270', 'red_bull_ring': '1271', 'catalunya': '1272', 'villeneuve': '1273',
        'miami': '1274', 'imola': '1275', 'marina_bay': '1276', 'suzuka': '1277',
        'losail': '1278', 'cota': '1279', 'rodriguez': '1280', 'interlagos': '1281',
        'vegas': '1282', 'yas_marina': '1283', 'jeddah': '1284', 'albert_park': '1285',
        'shanghai': '1286', 'baku': '1287', 'zandvoort': '1288'
      };

      const raceId = raceIdMapping[circuitId.toLowerCase()] || '1266';
      const proposedUrl = \`https://www.formula1.com/en/results/\${year}/races/\${raceId}/\${raceNameLower}/practice/1\`;
      document.getElementById('practice-url-input').value = proposedUrl;
    }

    function getTargetWikiPageName() {
      const year = document.getElementById('season-year').value;
      const dropdown = document.getElementById('race-round');
      const round = dropdown.value;
      if (!round || f1Schedule.length === 0) return '';
      const race = f1Schedule.find(r => r.round === round);
      if (!race) return '';
      
      // Typical page names are "2024 Monaco Grand Prix"
      return \`\${year} \${race.raceName}\`;
    }

    async function updatePageStatusBanner() {
      updatePracticeURLSuggestion();
      const pageName = getTargetWikiPageName();
      if (!pageName) return;

      document.getElementById('wiki-page-title').textContent = \`Page: \${pageName}\`;
      const domain = document.getElementById('wiki-domain').value;
      document.getElementById('wiki-page-url').textContent = \`URL: https://\${domain}/wiki/\${encodeURIComponent(pageName)}\`;
      document.getElementById('status-banner').style.display = 'flex';

      const badge = document.getElementById('wiki-status-badge');
      badge.className = 'status-badge';
      badge.textContent = 'Checking...';

      try {
        const res = await fetch('/api/wiki-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain, title: pageName })
        });
        
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        if (data.exists) {
          badge.className = 'status-badge exists';
          badge.textContent = 'Exists';
        } else {
          badge.className = 'status-badge missing';
          badge.textContent = 'Missing';
        }
      } catch (e) {
        badge.className = 'status-badge missing';
        badge.textContent = 'Unknown';
      }
    }

    // Main fetch F1 API data
    async function fetchF1Data() {
      const year = document.getElementById('season-year').value;
      const dropdown = document.getElementById('race-round');
      const round = dropdown.value;
      
      if (!round) {
        log('Please select a Grand Prix round.', 'warning');
        return;
      }

      log(\`Fetching Grand Prix data for round \${round} (\${year}) from Jolpi F1 API...\`, 'info');

      try {
        const res = await fetch(\`/api/race-data?year=\${year}&round=\${round}\`);
        if (!res.ok) throw new Error(\`API returned error: \${res.statusText}\`);
        
        const data = await res.json();
        driversList = data.drivers || [];
        
        // Write generated wikitexts to inputs
        document.getElementById('grid-wikitext').value = data.wikitexts.grid || '';
        document.getElementById('quali-wikitext').value = data.wikitexts.qualifying || '';
        document.getElementById('sprint-wikitext').value = data.wikitexts.sprint || '';
        document.getElementById('race-wikitext').value = data.wikitexts.race || '';
        document.getElementById('standings-wikitext').value = data.wikitexts.standings || '';
        
        log('Race results, Grid, Qualifying, and Standings wikitext generated successfully.', 'success');
        
        // Check if sprint results are present
        if (data.wikitexts.sprint && !data.wikitexts.sprint.includes('No sprint data')) {
          log('Detected Sprint Race results for this round.', 'info');
        }

        // Try to trigger auto scrape for practice
        log('Auto scraping practice sessions in background...', 'info');
        scrapePracticeSessionAPI();
      } catch (e) {
        log(\`Error fetching GP data: \${e.message}\`, 'error');
      }
    }

    // Scrape practice API
    async function scrapePracticeSessionAPI() {
      const year = document.getElementById('season-year').value;
      const dropdown = document.getElementById('race-round');
      const round = dropdown.value;
      const fp1Url = document.getElementById('practice-url-input').value;

      if (!round) return;

      log('Scraping practice session 1, 2 and 3 from F1.com...', 'info');

      try {
        const res = await fetch('/api/scrape-practice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year,
            round,
            url: fp1Url
          })
        });

        if (!res.ok) throw new Error('Cloudflare block or bad F1.com practice URL.');
        
        const data = await res.json();
        
        document.getElementById('practice-wikitext').value = data.wikitext || '';
        log('Practice tables scraped and generated successfully.', 'success');
        
        // Store scraped data locally
        practiceScrapedFP1 = data.fp1;
        practiceScrapedFP2 = data.fp2;
        practiceScrapedFP3 = data.fp3;
      } catch (e) {
        log(\`Practice auto scrape failed: \${e.message}. Using fallback method instead.\`, 'warning');
        
        // Build practice table with empty DNP cells since scraping failed
        buildDNPTestPracticeTable();
      }
    }

    function buildDNPTestPracticeTable() {
      // Create empty practice table (DNP)
      const year = document.getElementById('season-year').value;
      const dropdown = document.getElementById('race-round');
      const round = dropdown.value;
      
      log('Generating fallback DNP practice table. You can paste HTML below to replace it.', 'info');
      
      // Fetch fallback wikitext from server
      fetch('/api/scrape-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, round, url: '', fallbackOnly: true })
      })
      .then(res => res.json())
      .then(data => {
        document.getElementById('practice-wikitext').value = data.wikitext || '';
      })
      .catch(err => log('Failed to build empty practice table.', 'error'));
    }

    // Parse manually pasted HTML for Practice
    function parsePastedPracticeHTML() {
      const htmlText = document.getElementById('practice-html-input').value;
      const dropdown = document.getElementById('race-round');
      const round = dropdown.value;
      const year = document.getElementById('season-year').value;

      if (!htmlText.trim()) {
        log('Pasted HTML is empty.', 'warning');
        return;
      }

      log('Parsing pasted HTML structure for practice session times...', 'info');

      fetch('/api/scrape-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          round,
          pastedHtml: htmlText,
          fpSessionNumber: 1 // Default to FP1
        })
      })
      .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(data => {
        document.getElementById('practice-wikitext').value = data.wikitext || '';
        log('Pasted HTML parsed successfully and merged into Practice wikitext!', 'success');
      })
      .catch(e => {
        log(\`Error parsing pasted HTML: \${e.message}\`, 'error');
      });
    }

    // Wiki Connection tester
    async function testWikiConnection() {
      const domain = document.getElementById('wiki-domain').value;
      const username = document.getElementById('bot-username').value;
      const password = document.getElementById('bot-password').value;

      if (!username || !password) {
        log('Credentials empty. Update settings.', 'warning');
        return;
      }

      log(\`Testing wiki authentication on \${domain}...\`, 'info');
      
      const statusDot = document.getElementById('status-dot');
      const statusText = document.getElementById('status-text');
      
      statusDot.className = 'status-dot';
      statusText.textContent = 'Authenticating...';

      try {
        const res = await fetch('/api/wiki-login-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain, username, password })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
          log(\`Wiki login successful! Connection established with bot \${username}.\`, 'success');
          statusDot.className = 'status-dot online';
          statusText.textContent = \`Connected as \${username}\`;
        } else {
          throw new Error(data.error || 'Authentication error.');
        }
      } catch (e) {
        log(\`Wiki connection failed: \${e.message}\`, 'error');
        statusDot.className = 'status-dot';
        statusText.textContent = 'Disconnected / Auth Error';
      }
    }

    // Fetch Full wiki page content
    async function fetchWikiPageWikitext() {
      const pageName = getTargetWikiPageName();
      const domain = document.getElementById('wiki-domain').value;

      if (!pageName) {
        log('No Grand Prix page target selected.', 'warning');
        return;
      }

      log(\`Fetching wiki source for "\${pageName}"...\`, 'info');

      try {
        const res = await fetch('/api/wiki-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain, title: pageName })
        });

        const data = await res.json();
        
        if (res.ok) {
          if (data.exists) {
            document.getElementById('wiki-full-page-editor').value = data.content || '';
            log(\`Page "\${pageName}" loaded successfully (\${data.content.length} chars).\`, 'success');
          } else {
            document.getElementById('wiki-full-page-editor').value = '';
            log(\`Page "\${pageName}" does not exist yet. You can write content and create it.\`, 'info');
          }
        } else {
          throw new Error(data.error || 'Fetch failed');
        }
      } catch (e) {
        log(\`Error loading page text: \${e.message}\`, 'error');
      }
    }

    // Perform Test Edit on Sandbox
    async function testSandboxEdit() {
      const domain = document.getElementById('wiki-domain').value;
      const username = document.getElementById('bot-username').value;
      const password = document.getElementById('bot-password').value;
      const sandboxPage = document.getElementById('sandbox-page').value;

      if (!sandboxPage) {
        log('Sandbox page path is empty. Enter path in sidebar (e.g. User:Username/Sandbox).', 'warning');
        return;
      }

      const timestamp = new Date().toISOString();
      const testContent = \`== Bot Test ==\\nThis is a Cloudflare Worker automator connection test performed on \${timestamp}.\\n\\n~~~\`;

      log(\`Sending sandbox test edit request to "\${sandboxPage}"...\`, 'info');

      try {
        const res = await fetch('/api/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain, username, password,
            title: sandboxPage,
            text: testContent,
            summary: 'Bot test edit from Cloudflare Automator Worker',
            isTest: true
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          log(\`Test edit published successfully! Check it here: https://\${domain}/wiki/\${encodeURIComponent(sandboxPage)}\`, 'success');
        } else {
          throw new Error(data.error || 'Edit request failed');
        }
      } catch (e) {
        log(\`Test edit failed: \${e.message}\`, 'error');
      }
    }

    // Publish specific section
    async function publishSection(sectionHeader, wikitextTextareaId) {
      const pageName = getTargetWikiPageName();
      const domain = document.getElementById('wiki-domain').value;
      const username = document.getElementById('bot-username').value;
      const password = document.getElementById('bot-password').value;
      const newSectionContent = document.getElementById(wikitextTextareaId).value;

      if (!pageName) {
        log('No Grand Prix page target selected.', 'warning');
        return;
      }
      if (!username || !password) {
        log('Bot credentials missing. Log in first.', 'warning');
        return;
      }
      if (!newSectionContent.trim()) {
        log('Wikitext content to publish is empty.', 'warning');
        return;
      }

      log(\`Updating section "\${sectionHeader}" on page "\${pageName}"...\`, 'info');

      try {
        // Step 1: Fetch current page text
        const contentRes = await fetch('/api/wiki-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain, title: pageName })
        });
        
        const contentData = await contentRes.json();
        let pageText = '';
        
        if (contentRes.ok && contentData.exists) {
          pageText = contentData.content || '';
        } else {
          log(\`Page "\${pageName}" does not exist. Creating new page with this section...\`, 'info');
        }

        // Step 2: Replace section
        const publishRes = await fetch('/api/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain, username, password,
            title: pageName,
            text: newSectionContent,
            sectionHeader,
            currentFullText: pageText,
            summary: \`Automated update of \${sectionHeader} section\`
          })
        });

        const data = await publishRes.json();
        if (publishRes.ok && data.success) {
          log(\`Successfully updated section "\${sectionHeader}" on "\${pageName}"!\`, 'success');
          updatePageStatusBanner();
        } else {
          throw new Error(data.error || 'Publish failed');
        }
      } catch (e) {
        log(\`Error publishing section: \${e.message}\`, 'error');
      }
    }

    // Publish entire page
    async function publishFullPage() {
      const pageName = getTargetWikiPageName();
      const domain = document.getElementById('wiki-domain').value;
      const username = document.getElementById('bot-username').value;
      const password = document.getElementById('bot-password').value;
      const fullText = document.getElementById('wiki-full-page-editor').value;

      if (!pageName) {
        log('No Grand Prix page target selected.', 'warning');
        return;
      }
      if (!username || !password) {
        log('Bot credentials missing. Log in first.', 'warning');
        return;
      }
      if (!fullText.trim()) {
        log('Wikitext editor is empty.', 'warning');
        return;
      }

      log(\`Deploying full page content to "\${pageName}"...\`, 'info');

      try {
        const res = await fetch('/api/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain, username, password,
            title: pageName,
            text: fullText,
            summary: 'Automated deployment of complete Grand Prix results page'
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          log(\`Successfully deployed complete page "\${pageName}"! Check it on the wiki.\`, 'success');
          updatePageStatusBanner();
        } else {
          throw new Error(data.error || 'Deployment failed');
        }
      } catch (e) {
        log(\`Error deploying page: \${e.message}\`, 'error');
      }
    }
  </script>
</body>
</html>
`;
