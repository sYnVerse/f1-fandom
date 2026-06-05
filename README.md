# F1 Fandom Wiki Automator

A comprehensive automation tool for generating and maintaining Formula One Wiki tables on [f1.fandom.com](https://f1.fandom.com). This project combines **TypeScript** (55.5%) and **Python** (44.5%) to create fully formatted WikiTables for Grand Prix articles.

## Features

### Core Functionality
- **Wiki API Integration**: Authenticate with MediaWiki accounts using bot passwords and manage wiki sessions securely
- **F1 Data Fetching**: Retrieve real-time Formula One data from the Ergast API including:
  - Season schedules and race calendars
  - Race results and finishing positions
  - Qualifying session results with Q1, Q2, Q3 times
  - Practice session data (FP1, FP2, FP3)
  - Driver and Constructor standings
  - Sprint race results

### WikiText Generation
- **Grid Table Generation**: Automatically format starting grid wikitext with driver positions and constructors
- **Qualifying Results Tables**: Generate properly formatted qualifying session tables with multiple session data
- **Race Results Tables**: Create race result tables with driver positions, points, fastest lap data, and race status
- **Driver Standings Tables**: Format current driver championship standings with consistent styling
- **Constructor Standings Tables**: Display constructor points and rankings
- **Practice Session Tables**: Generate FP1, FP2, and FP3 session results with driver times

### Wiki Management
- **Page Editing**: Create and modify wiki pages with automatic section replacement
- **Session Management**: Handle MediaWiki authentication with CSRF token management
- **CORS Support**: Cross-Origin Resource Sharing enabled for frontend integration
- **Content Updates**: Push generated wikitext directly to wiki pages

### Frontend Dashboard
- **Modern Web Interface**: F1-themed dark dashboard with intuitive controls
- **Real-time Data Retrieval**: Interactive forms to fetch and preview race data
- **Bot Verification**: Cloudflare Turnstile integration for security
- **Responsive Design**: Mobile-friendly interface with professional styling

### Data Processing
- **Driver Mapping**: Map and standardize driver names across different data sources
- **Time Calculations**: Calculate 107% qualifying times and convert time differentials to absolute times
- **Flag Templates**: Automated nationality-to-flag-template conversion for 25+ countries
- **Constructor Templates**: Map constructor IDs to wiki template format with country flags

### Python Utilities
- **Legacy Python Scripts**: Original Python-based wiki table generation with Pandas integration
- **Ergast Data Handling**: Python wrapper for Ergast F1 API data processing
- **Web Scraping**: BeautifulSoup integration for practice session data collection
- **Status Code Handling**: Proper handling of race status codes (Retired, Disqualified, DNS, etc.)

## Technology Stack

- **Backend**: TypeScript (Cloudflare Workers)
- **Data Sources**: Ergast F1 API
- **Wiki Integration**: MediaWiki API
- **Frontend**: HTML5, CSS3, JavaScript
- **Python Tools**: Pandas, Requests, BeautifulSoup
- **Security**: Cloudflare Turnstile verification
- **Storage**: Cloudflare KV (optional logging)

## Use Cases

- Automated wiki article updates after each F1 race weekend
- Batch updates of season schedules and standings
- Practice session result documentation
- Grid and qualifying result table generation
- Championship standings synchronization

## Project Structure

```
f1-fandom/
├── src/
│   ├── index.ts              # Main Cloudflare Worker handler
│   ├── f1-api.ts             # Ergast API integration
│   ├── wiki.ts               # MediaWiki API integration
│   ├── wikitext-generator.ts # WikiTable formatting
│   └── frontend-html.ts      # Web dashboard UI
├── f1.py                     # Python wiki table generator
├── pyergast.py               # Python Ergast API wrapper
└── README.md
```

## Getting Started

1. Set up wiki authentication credentials (bot account on f1.fandom.com)
2. Configure environment variables for wiki domain and bot password
3. Deploy Cloudflare Worker to enable automated table generation
4. Use the web dashboard or API endpoints to trigger updates
5. Verify generated wikitext before publishing to wiki

---

Built for Formula One Wiki enthusiasts and contributors.
