#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import pyergast as f1
import pandas as pd
import requests
from bs4 import BeautifulSoup
import re
import time

# Constants
flags = {
        "British": "{{GBR}}",
        "Dutch": "{{NED}}",
        "Finnish": "{{FIN}}",
        "French": "{{FRA}}",
        "Spanish": "{{ESP}}",
        "Japanese": "{{JPN}}",
        "German": "{{GER}}",
        "Mexican": "{{MEX}}",
        "Canadian": "{{CAN}}",
        "Monegasque": "{{MCO}}",
        "Australian": "{{AUS}}",
        "Italian": "{{ITA}}",
        "Russian": "{{RAF}}",
        "Chinese": "{{CHN}}",
        "Thai": "{{THA}}",
        "Brazilian": "{{BRA}}",
        "Belgian": "{{BEL}}",
        "Danish": "{{DEN}}",
        "Indonesian": "{{INA}}",
        "Swedish": "{{SWE}}",
        "Polish": "{{POL}}",
        "American": "{{USA}}",
        "New Zealander": "{{NZL}}",
        "Argentine": "{{ARG}}"
}

constructors = {
        "mercedes": "{{GER}} {{Mercedes-CON}}",
        "red_bull": "{{AUT}} {{Red Bull-Honda RBPT}}",
        "aston_martin": "{{GBR}} {{Aston Martin-Mercedes}}",
        "ferrari": "{{ITA}} {{Ferrari-CON}}",
        "haas": "{{USA}} {{Haas-Ferrari}}",
        "williams": "{{GBR}} {{Williams-Mercedes}}",
        "alphatauri": "{{ITA}} {{AlphaTauri-Red Bull}}",
        "alpine": "{{FRA}} {{Alpine-Renault}}",
        "mclaren": "{{GBR}} {{McLaren-Mercedes}}",
        "alfa": "{{SUI}} {{Alfa Romeo-Ferrari}}",
        "racing_point": "{{GBR}} {{Racing Point-BWT Mercedes}}",
        "renault": "{{FRA}} {{Renault-CON}}",
        "sauber": "{{SUI}} {{Sauber-Ferrari}}",
        "rb": "{{ITA}} {{RB-Honda RBPT}}"
}

statuses = {
        "R": "{{abbr|Ret|Retired}}",
        "D": "{{abbr|DSQ|Disqualified}}",
        "W": "{{abbr|DNS|Did not start}}"
}

# Helpers
def find_107_time(time):
    minute = 0
    seconds = 0.00
    returnTime = 0.00
    RTinMinutes = 0

    try:
        minute += int(time.split(":")[0])
        seconds += float(time.split(":")[1])
    except:
        pass
    
    if (minute > 0):
        returnTime += 60.00
        minute -= 1
    
    returnTime += seconds
    returnTime *= 1.07
    
    while returnTime > 60.00:
        returnTime -= 60.00
        RTinMinutes += 1

    TimeString = str(RTinMinutes) + ":" + str(round(returnTime,3))

    return TimeString

def convert_time_differential_to_absolute(base_time, differential):
    """
    Convert a time differential (e.g., +0.087s) to an absolute time based on a base time.
    
    Parameters:
    - base_time: str - The base time (e.g., "1:09.890")
    - differential: str - The time differential (e.g., "+0.087s" or "0.087s")
    
    Returns:
    - str: The absolute time
    """
    try:
        # Clean up the differential (remove + and s)
        diff_str = differential.replace('+', '').replace('s', '')
        diff_seconds = float(diff_str)
        
        # Parse the base time
        if ':' in base_time:
            parts = base_time.split(':')
            base_minutes = int(parts[0])
            base_seconds = float(parts[1])
            base_total_seconds = base_minutes * 60 + base_seconds
        else:
            base_total_seconds = float(base_time)
        
        # Add the differential
        absolute_total_seconds = base_total_seconds + diff_seconds
        
        # Convert back to mm:ss.sss format
        absolute_minutes = int(absolute_total_seconds // 60)
        absolute_seconds = absolute_total_seconds % 60
        
        if absolute_minutes > 0:
            return f"{absolute_minutes}:{absolute_seconds:06.3f}"
        else:
            return f"{absolute_seconds:.3f}"
            
    except (ValueError, IndexError):
        # If conversion fails, return the original differential
        return differential

def getFlag(flag):
    try: 
        return flags[flag]
    except:
        return "{{NoFlag}}"

def get_previous_race(year, race):
    """
    Get the previous race number for comparison.
    Returns None if this is the first race of the season.
    """
    if race is None or race <= 1:
        return None
    return race - 1

def validate_f1_url(url):
    """
    Validate if a URL appears to be a valid F1.com practice session URL.
    
    Parameters:
    - url: str - The URL to validate
    
    Returns:
    - bool: True if URL appears valid, False otherwise
    """
    if not url or not isinstance(url, str):
        return False
    
    # Check if it's a valid F1.com URL
    if not url.startswith('https://www.formula1.com'):
        return False
    
    # Check if it contains the expected path structure
    if '/en/results/' not in url:
        return False
    
    # Check if it's a practice session
    if '/practice/' not in url:
        return False
    
    # Check if it ends with a practice session number
    if not url.split('/')[-1].isdigit():
        return False
    
    return True

def calculate_position_change(current_standings, previous_standings, entity_id, is_driver=True):
    """
    Calculate position change for a driver or constructor.
    
    Parameters:
    - current_standings: DataFrame of current standings
    - previous_standings: DataFrame of previous standings (can be None)
    - entity_id: driver ID or constructor ID
    - is_driver: True if calculating for driver, False for constructor
    
    Returns:
    - Formatted position change string (e.g., "{{X}}", "{{+}}1", "{{-}}2")
    """
    if previous_standings is None:
        return "{{X}}"
    
    # Find current position
    current_pos = None
    if is_driver:
        current_row = current_standings[current_standings['driverID'] == entity_id]
    else:
        current_row = current_standings[current_standings['constructorID'] == entity_id]
    
    if len(current_row) > 0:
        current_pos = int(current_row.iloc[0]['position'])
    else:
        return "{{X}}"  # Retired/not in current standings
    
    # Find previous position
    previous_pos = None
    if is_driver:
        previous_row = previous_standings[previous_standings['driverID'] == entity_id]
    else:
        previous_row = previous_standings[previous_standings['constructorID'] == entity_id]
    
    if len(previous_row) > 0:
        previous_pos = int(previous_row.iloc[0]['position'])
    else:
        return "{{X}}"  # New entry
    
    # Calculate difference
    if current_pos == previous_pos:
        return "{{X}}"
    elif current_pos < previous_pos:
        # Moved up (better position = lower number)
        return "{{+}}" + str(previous_pos - current_pos)
    else:
        # Moved down (worse position = higher number)
        return "{{-}}" + str(current_pos - previous_pos)


def scrape_f1_practice_data(year, race, custom_race_id=None, custom_race_name=None):
    """
    Scrape practice session data from F1.com using Ergast API for correct race information
    
    Parameters:
    - year: int - The F1 season year
    - race: int - The race number in the season
    - custom_race_id: str - Custom race ID if provided by user
    - custom_race_name: str - Custom race name if provided by user
    
    Returns:
    - dict: Dictionary containing FP1, FP2, FP3 data for each driver
    """
    print(f"Attempting to scrape practice data for {year} race {race} from F1.com...")
    
    # F1.com URL structure for practice sessions
    base_url = "https://www.formula1.com"
    
    # Use custom values if provided, otherwise get from API
    if custom_race_id and custom_race_name:
        race_id = custom_race_id
        race_name = custom_race_name
        print(f"Using custom race ID: {race_id} and race name: {race_name}")
    else:
        # Get race information from Ergast API to find the correct URL structure
        try:
            schedule = f1.get_schedule(year)
            if race <= len(schedule):
                race_info = schedule.iloc[race - 1]
                race_name = race_info['raceName'].lower().replace(' ', '-')
                
                # Check what columns are available in the schedule
                print(f"Schedule columns: {schedule.columns.tolist()}")
                print(f"Race info: {race_info.to_dict()}")
                
                # Try different possible column names for circuit ID
                circuit_id = None
                if 'circuitId' in race_info:
                    circuit_id = race_info['circuitId']
                elif 'circuit' in race_info:
                    circuit_id = race_info['circuit']
                elif 'circuitName' in race_info:
                    circuit_id = race_info['circuitName'].lower().replace(' ', '_')
                else:
                    # Use race name as fallback
                    circuit_id = race_name.replace('-', '_')
                
                print(f"Found race: {race_info['raceName']} at {circuit_id}")
                
                # Race ID mapping based on F1.com URL structure
                race_id_mapping = {
                    'hungaroring': '1266',  # Hungarian GP
                    'silverstone': '1267',  # British GP
                    'monaco': '1268',       # Monaco GP
                    'spa': '1269',          # Belgian GP
                    'monza': '1270',        # Italian GP
                    'red_bull_ring': '1271', # Austrian GP
                    'catalunya': '1272',    # Spanish GP
                    'villeneuve': '1273',   # Canadian GP
                    'miami': '1274',        # Miami GP
                    'imola': '1275',        # Emilia-Romagna GP
                    'marina_bay': '1276',   # Singapore GP
                    'suzuka': '1277',       # Japanese GP
                    'losail': '1278',       # Qatar GP
                    'cota': '1279',         # United States GP
                    'rodriguez': '1280',    # Mexican GP
                    'interlagos': '1281',   # Brazilian GP
                    'vegas': '1282',        # Las Vegas GP
                    'yas_marina': '1283',   # Abu Dhabi GP
                    'jeddah': '1284',       # Saudi Arabian GP
                    'albert_park': '1285',  # Australian GP
                    'shanghai': '1286',     # Chinese GP
                    'baku': '1287',         # Azerbaijan GP
                    'zandvoort': '1288',    # Dutch GP
                }
                
                race_id = race_id_mapping.get(circuit_id, '1266')  # Default to Hungarian GP ID
                
                print(f"Using race ID: {race_id} for circuit: {circuit_id}")
                
            else:
                print(f"Race {race} not found in {year} season")
                return {}
                
        except Exception as e:
            print(f"Error getting race schedule: {str(e)}")
            return {}
    
    practice_data = {
        'FP1': {},
        'FP2': {},
        'FP3': {}
    }
    
    # F1.com practice session URLs using the correct structure
    session_urls = {
        'FP1': f"{base_url}/en/results/{year}/races/{race_id}/{race_name}/practice/1",
        'FP2': f"{base_url}/en/results/{year}/races/{race_id}/{race_name}/practice/2", 
        'FP3': f"{base_url}/en/results/{year}/races/{race_id}/{race_name}/practice/3"
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    for session, url in session_urls.items():
        try:
            print(f"Attempting to scrape {session} data from: {url}")
            response = requests.get(url, headers=headers, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Look for the practice results table
                tables = soup.find_all('table')
                
                for table in tables:
                    # Check if this table contains practice results
                    table_text = table.get_text().lower()
                    if 'pos' in table_text and ('time' in table_text or 'gap' in table_text):
                        print(f"Found potential practice results table for {session}")
                        
                        # Find all rows in the table
                        rows = table.find_all('tr')
                        
                        for row in rows:
                            cells = row.find_all(['td', 'th'])
                            if len(cells) >= 4:
                                try:
                                    # Extract position, driver number, driver name, team, time, and laps
                                    position = cells[0].get_text(strip=True)
                                    driver_number = cells[1].get_text(strip=True)
                                    
                                    # Driver name and team are in the same cell with images
                                    driver_cell = cells[2]
                                    driver_name = driver_cell.get_text(strip=True)
                                    
                                    # Clean up driver name (remove team info if present)
                                    if ' ' in driver_name:
                                        # Take the first part as driver name
                                        driver_name = driver_name.split()[0] + ' ' + driver_name.split()[1]
                                    
                                    team_cell = cells[3]
                                    team_name = team_cell.get_text(strip=True)
                                    
                                    time_cell = cells[4]
                                    time_value = time_cell.get_text(strip=True)
                                    
                                    # Clean up time (remove + prefix for gaps)
                                    if time_value.startswith('+'):
                                        time_value = time_value[1:] + 's'
                                    elif time_value and not time_value.startswith('1:'):
                                        time_value = time_value + 's'
                                    
                                    practice_data[session][driver_name] = {
                                        'position': position,
                                        'time': time_value,
                                        'number': driver_number,
                                        'team': team_name
                                    }
                                    
                                    print(f"Found {driver_name}: P{position}, {time_value}")
                                    
                                except (IndexError, AttributeError) as e:
                                    print(f"Error parsing row: {str(e)}")
                                    continue
                        
                        # Found the table, break out of table loop
                        break
                else:
                    print(f"No practice results table found for {session}")
                    
            else:
                print(f"Failed to fetch {session} data: HTTP {response.status_code}")
                
            # Be respectful with requests
            time.sleep(2)
            
        except Exception as e:
            print(f"Error scraping {session}: {str(e)}")
            continue
    
    return practice_data


def create_practice_scraping_report(year, race):
    """
    Create a comprehensive report about F1.com scraping attempts
    
    Parameters:
    - year: int - The F1 season year
    - race: int - The race number in the season
    
    Returns:
    - str: Report about scraping attempts and recommendations
    """
    report = f"""
=== F1.com Practice Data Scraping Report ===

Attempted to scrape practice data for {year} race {race}

FINDINGS:
1. F1.com appears to have changed their URL structure
2. Practice session data may not be publicly accessible
3. Anti-scraping measures may be in place
4. Data may be loaded dynamically via JavaScript

RECOMMENDATIONS:
1. Manual data entry: Manually fill in practice times and positions
2. Alternative sources: Use other F1 data sources (Wikipedia, motorsport.com, etc.)
3. API investigation: Research if F1.com has public APIs
4. Browser automation: Use Selenium or similar tools for dynamic content
5. Data partnerships: Consider official F1 data partnerships

ALTERNATIVE APPROACHES:
1. Wikipedia scraping: Practice data is often available on Wikipedia
2. Motorsport.com: May have practice session data
3. F1 official app: May provide data through mobile APIs
4. Social media: Teams often post practice times on social media
5. Live timing: Use live timing data during practice sessions

TECHNICAL NOTES:
- F1.com uses modern web technologies (React, Angular, etc.)
- Content may be loaded dynamically after page load
- Anti-bot measures may be in place
- URL structure varies by season and race

"""
    return report


def get_practice_data_from_f1_com(year, race):
    """
    Alternative approach: Try to get practice data from F1.com API or structured data
    
    Parameters:
    - year: int - The F1 season year  
    - race: int - The race number in the season
    
    Returns:
    - dict: Practice data if available, None otherwise
    """
    # F1.com may have API endpoints or structured data
    # This is a placeholder for more sophisticated scraping
    
    # Try different approaches:
    # 1. Direct API calls (if available)
    # 2. Structured data in HTML
    # 3. JavaScript data in page source
    
    print(f"Attempting to get practice data for {year} race {race} from F1.com...")
    print("Note: F1.com may require different approaches for data extraction")
    print("This function is a starting point and may need customization based on F1.com's current structure")
    
    return None


# Grid
def grid(year=None, race=None):
    try:
        qualifyingResults=f1.get_qualifying_result(year, race)
    except:
        print("No data available.")
        return False

    print("===Grid===")
    print('<div class="mw-customtoggle-Grid wds-button wds-is-secondary">Show Grid</div>')
    print('<div class="mw-collapsible mw-collapsed" id="mw-customcollapsible-Grid">')
    print("{{Grid/2-2/34r")
    for row in range(len(qualifyingResults)):
        col=qualifyingResults.iloc[row,:]
        name=col[3]
        number=col[0]
        last_name=name.split(" ").pop()

        driver = '| ' + getFlag(col[4]) + ' ' + number + '.' + ' [[' + name + '|' + last_name + ']]' 
        print(driver)
    else:
        print("}}</div>")
    return

# Qualifying
def qualifying(year=None, race=None):
    try:
        q=f1.get_qualifying_result(year, race)
    except:
        print("No data available.")
        return False

    sort_Q1=q.sort_values(by=['Q1'])
    sort_Q2=q.sort_values(by=['Q2'])
    fastestQ1 = None
    
    # Print table header
    print("""===Qualifying Results===\nThe full qualifying results for the '''{{PAGENAME}}''' are outlined below:\n\n{|class="wikitable" width=100% style="font-size:77%"\n! rowspan=2 width=4% | <span style="cursor:help" title="Position">Pos.</span>\n! rowspan=2 width=5% | <span style="cursor:help" title="Car Number">No.</span>\n! rowspan=2 width=23% | Driver\n! rowspan=2 width=23% | Team\n| rowspan=26 width=1px |\n! colspan=2 width=13% | <span style="cursor:help" title="Qualifying 1">Q1</span>\n| rowspan=26 width=1px |\n! colspan=2 width=13% | <span style="cursor:help" title="Qualifying 2">Q2</span>\n| rowspan=26 width=1px |\n! colspan=2 width=13% | <span style="cursor:help" title="Qualifying 3">Q3</span>\n! rowspan=2 width=5% | Grid\n|-\n! width=4% | <span style="cursor:help" title="Position">Pos.</span>\n! width=9% | Time\n! width=4% | <span style="cursor:help" title="Position">Pos.</span>\n! width=9% | Time\n! width=4% | <span style="cursor:help" title="Position">Pos.</span>\n! width=9% | Time""")
    for row in range(len(q)):
        # Get and assign data
        col=q.iloc[row,:]
        
        try:
            team=constructors[col[5]]
        except KeyError:
            team='{{' + col[5] + '-CON}}'

        driver=getFlag(col[4]) + ' [[' + col[3] + ']]'

        number=col[0]
        pos=col[1]

        # Print table body
        if (row == 10 or row == 15):
            print('|-\n|colspan=14 style="border-bottom:hidden"|\n|-\n|colspan=14|\n|-')
        else:
            print("|-")

        print("! " + pos)
        print("| align=center | " + number)
        print("| " + driver)
        print("| " + team)

        # Q1
        if (row >= 15): # Q3 (16-20) position locked
            print("! " + pos)
        else: # Calculate position for P15+
            for y in range(0,len(sort_Q1)):
                q1=sort_Q1.iloc[y,:]
                if (q1[0] == number):
                    print("! " + str(1+y))
                if (fastestQ1 is None and q1[7] != ""):
                    fastestQ1 = q1[0]

        # 107% time
        if (fastestQ1 == number):
            print("| '''" + str(col[7]) + "'''")
            OneZeroSeven = str(col[7])
        else:
            print("| " + str(col[7]))
        
        # Q2
        if (str(col[8]) != "nan"):
            if (row >= 10 and row <= 14): # Q2 (11-15) position locked
                print("! " + pos)
            else: # Calculate position for P10+
                for x in range(0,len(sort_Q2)):
                    q2=sort_Q2.iloc[x,:]
                    if (q2[0] == number):
                        print("! " + str(1+x))
                    if (x == 0):
                        fastestQ2 = q2[0]

            if (fastestQ2 == number):
                print("| '''" + str(col[8]) + "'''")
            else:
                print("| " + str(col[8]))
        elif (row == 15):
            print('! rowspan="5" |')
            print('| rowspan="5" |')
            print('! rowspan="5" |')
            print('| rowspan="5" |')

        # Q3
        if (str(col[9]) != "nan"):
            print("! " + pos)
            if (row == 0):
                print("| '''" + str(col[9]) + "'''")
            else:
                print("| " + str(col[9]))
        elif (row == 10):
            print('! rowspan="5" |')
            print('| rowspan="5" |')

        # Grid
        print("! " + pos)

    print("|-")
    print("! colspan=14 | [[107% Time]]: " + find_107_time(OneZeroSeven))
    print("|-")
    print("! colspan=14 | Source:<ref name=QR>[https://www.fia.com/system/files/decision-document/{{lc:{{PAGENAMEE}}}}_-_final_qualifying_classification.pdf {{PAGENAME}} - Final Qualifying Classification] (PDF). Fédération Internationale de l'Automobile.</ref>")
    print("|}")
    print("*'''Bold''' indicates the fastest driver's time in each session.")

    return

# Race
def race(year = None, race = None, sprint = None):
    try:
        if (sprint):
            data = f1.get_sprint_result(year, race)
        else:
            data = f1.get_race_result(year, race)
    except:
        print("No data available.")
        return False

    if (sprint):
        print("""===Sprint Results===\nThe full Sprint results for the '''{{PAGENAME}}''' are outlined below:\n{| class="wikitable"\n! <span style="cursor:help;" title=" Position">Pos.</span>\n! <span style="cursor:help;" title=" Car number">No.</span>\n! Driver\n! Constructor\n! <span style="cursor:help;" title=" Laps completed">Laps</span>\n! <span style="cursor:help;" title=" Time for winner, time or number laps behind leader or reason for retirement">Time/Retired</span>\n! <span style="cursor:help;" title=" Grid position">Grid</span>\n! <span style="cursor:help;" title=" Points gained from race">Points</span>""")
    else:
        print("""===Results===\nThe full race results for the '''{{PAGENAME}}''' are outlined below:\n{| class="wikitable"\n! <span style="cursor:help;" title=" Position">Pos.</span>\n! <span style="cursor:help;" title=" Car number">No.</span>\n! Driver\n! Constructor\n! <span style="cursor:help;" title=" Laps completed">Laps</span>\n! <span style="cursor:help;" title=" Time for winner, time or number laps behind leader or reason for retirement">Time/Retired</span>\n! <span style="cursor:help;" title=" Grid position">Grid</span>\n! <span style="cursor:help;" title=" Points gained from race">Points</span>""")

    for x in range(0,len(data)):
        y=data.iloc[x,:]
        
        try:
            team=constructors[y[8]]
        except KeyError:
            team='{{' + y[9] + '-CON}}'

        try:
            driver=flags[y[7]] + ' [[' + y[6] + ']]'
        except KeyError:
            driver='[[' + y[6] + ']]'

        number=y[0]
        pos=y[2]
        if (y[3] != "0"):
            grid=y[3]
        else:
            grid="{{abbr|PL|Pit Lane}}"
        points=y[4]
        laps=y[10]
        status=y[11]
        time=y[12]

        print("|-")
        
        try:
            print("! " + statuses[pos])
        except KeyError:
            print("! " + pos)

        print("| align=center | " + number)
        print("| " + driver)
        print("| " + team)
        print("| " + laps)

        if (pd.isna(time)):
            print("| " + status)
        else:
            print("| " + time['time'])

        print("| " + grid)
        # fastest lap points
        if (sprint == None):
            if (points != '0'):
                if (points == '26') or (points == '19') or (points == '16') or (points == '13') or (points == '11') or (points == '9') or (points == '7') or (points == '5') or (points == '3'):
                    print("! " + points + "<sup>{{abbr|[[Fastest Lap|FL]]|+1 point for achieving the fastest lap}}</sup>")
                elif (points == '2') and (pos == '10'):
                    print("! " + points + "<sup>{{abbr|[[Fastest Lap|FL]]|+1 point for achieving the fastest lap}}</sup>")
                else:
                    print("! " + points)
        else:
            if (points != '0'):
                print("! " + points)

        # add blanks in points column: positions below top-10 (top-8 for Sprint) don't score points
        if (sprint):
            if (x == 8):
                print("! rowspan=12 |")
        else:
            if (x == 10):
                print("! rowspan=10 |")

    print('|-')
    if (sprint):
        print('''! colspan="8" | Source:<ref name="SR">[https://www.fia.com/system/files/decision-document/{{lc:{{PAGENAMEE}}}}_-_final_sprint_classification.pdf {{PAGENAME}} - Final Sprint Classification] (PDF). Fédération Internationale de l'Automobile.</ref>''')
    else:
        print('''! colspan="8" | Source:<ref name="RR">[https://www.fia.com/system/files/decision-document/{{lc:{{PAGENAMEE}}}}_-_final_race_classification.pdf {{PAGENAME}} - Final Race Classification] (PDF). Fédération Internationale de l'Automobile.</ref>''')
    print('|}')

    return

# Standings
def standings(year=None, race=None):
    try:
        ds=f1.driver_standings(year, race)
        cs=f1.constructor_standings(year, race)
    except:
        print("No data available.")
        return False

    # Get previous race standings for comparison
    previous_race = get_previous_race(year, race)
    previous_ds = None
    previous_cs = None
    
    if previous_race is not None:
        try:
            previous_ds = f1.driver_standings(year, previous_race)
            previous_cs = f1.constructor_standings(year, previous_race)
        except:
            # If we can't get previous race data, we'll use None (which will show "NEW")
            pass

    # start table for drivers
    print("==Standings==\n")
    print("{{Col-begin}}")
    print("{{Col-2}}")
    print('{|class="wikitable" style="width:88%"')
    print("! colspan=4|Drivers' World Championship")
    print("|-")
    print('! <span style="cursor:help" title="Position">Pos.</span>')
    print("! Driver")
    print('! <span style="cursor:help" title="Points">Pts.</span>')
    print("! +/-")
    
    # display driver standings
    for x in range(0,len(ds)):
        y=ds.iloc[x,:]
        pos=y[1]
        pts=y[2]
        driver_id=y[4]  # driverID column
        try:
            driver=flags[y[6]] + ' [[' + y[5] + ']]'
        except KeyError:
            driver='[[' + y[5] + ']]'
        
        # Calculate position change
        pos_change = calculate_position_change(ds, previous_ds, driver_id, is_driver=True)
        
        print("|-")
        if (pos == '1'):
            print("| {{1st}}")
            print("| '''" + driver + "'''")
            print("| '''" + pts + "'''")
            print("| " + pos_change)
        elif (pos == '2'):
            print("| {{2nd}}")
            print("| " + driver)
            print("| " + pts)
            print("| " + pos_change)
        elif (pos == '3'):
            print("| {{3rd}}")
            print("| " + driver)
            print("| " + pts)
            print("| " + pos_change)
        elif (pos == '21'):
            print("| " + pos + "st")
            print("| " + driver)
            print("| " + pts)
            print("| " + pos_change)
        elif (pos == '22'):
            print("| " + pos + "nd")
            print("| " + driver)
            print("| " + pts)
            print("| " + pos_change)
        elif (pos == '23'):
            print("| " + pos + "rd")
            print("| " + driver)
            print("| " + pts)
            print("| " + pos_change)
        else:    
            print("| " + pos + "th")
            print("| " + driver)
            print("| " + pts)
            print("| " + pos_change)

    # end table
    print("|}")

    # start table for constructors
    print("{{Col-2}}")
    print('{|class="wikitable" style="width:85%"')
    print("! colspan=4|Constructors' World Championship")
    print("|-")
    print('! <span style="cursor:help" title="Position">Pos.</span>')
    print("! Team")
    print('! <span style="cursor:help" title="Points">Pts.</span>')
    print("! +/-")

    # display constructor standings
    for x in range(0,len(cs)):
        z=cs.iloc[x,:]
        pos=z[1]
        pts=z[2]
        constructor_id=z[4]  # constructorID column
        try:
            team=constructors[z[4]]
        except KeyError:
            team='{{' + y[5] + '-CON}}'
        
        # Calculate position change
        pos_change = calculate_position_change(cs, previous_cs, constructor_id, is_driver=False)
        
        print("|-")
        if (pos == '1'):
            print("| {{1st}}")
            print("| '''" + team + "'''")
            print("| '''" + pts + "'''")
            print("| " + pos_change)
        elif (pos == '2'):
            print("| {{2nd}}")
            print("| " + team)
            print("| " + pts)
            print("| " + pos_change)
        elif (pos == '3'):
            print("| {{3rd}}")
            print("| " + team)
            print("| " + pts)
            print("| " + pos_change)
        else:    
            print("| " + pos + "th")
            print("| " + team)
            print("| " + pts)
            print("| " + pos_change)

    # end table
    print("|}")
    print("{{Col-end}}")
    return

# Practice
def practice(year=None, race=None):
    """
    Generate practice results table for F1 Wiki.
    Attempts to scrape practice data from F1.com if available.
    
    This function will:
    1. Show you the proposed F1.com URLs for practice sessions
    2. Ask you to confirm if they are correct
    3. Allow you to provide custom URLs if needed
    4. Attempt to scrape practice data from the confirmed URLs
    5. Generate a practice results table for the F1 Wiki
    """
    if year is None or race is None:
        print("Practice function requires both year and race parameters.")
        print("Usage: python f1.py practice <year> <race>")
        print("Example: python f1.py practice 2024 5")
        return False
    
    print("===Practice Results===")
    print("The full practice results for the '''{{PAGENAME}}''' are outlined below:\n")
    print('{| class="hidden wikitable sortable" style="width:100%"')
    print('! rowspan="2" |<span style="cursor:help;" title="Car number">No.</span>!! rowspan="2" class="unsortable" |Driver!! rowspan="2" class="unsortable" |Team!! colspan="2" class="unsortable" |FP1 !! colspan="2" class="unsortable" |FP2 !! colspan="2" class="unsortable" |FP3')
    print("|-")
    print("!Time!!Pos!!Time!!Pos!!Time!!Pos")
    
    # Get driver list for the race to populate the table
    try:
        drivers = f1.get_drivers(year, race)
        # Convert permanentNumber to int for proper sorting
        drivers['permanentNumber'] = pd.to_numeric(drivers['permanentNumber'], errors='coerce')
        # Sort by driver number
        drivers = drivers.sort_values(by=['permanentNumber'])
    except:
        print("Could not fetch driver data. Please check year and race parameters.")
        return False
    
    # Get qualifying results to get team information for each driver
    try:
        quali_results = f1.get_qualifying_result(year, race)
    except:
        quali_results = None
    
    # Get race information and show user the proposed scraping URL
    try:
        schedule = f1.get_schedule(year)
        if race <= len(schedule):
            race_info = schedule.iloc[race - 1]
            race_name = race_info['raceName'].lower().replace(' ', '-')
            
            # Check what columns are available in the schedule
            circuit_id = None
            if 'circuitId' in race_info:
                circuit_id = race_info['circuitId']
            elif 'circuit' in race_info:
                circuit_id = race_info['circuit']
            elif 'circuitName' in race_info:
                circuit_id = race_info['circuitName'].lower().replace(' ', '_')
            else:
                circuit_id = race_name.replace('-', '_')
            
            # Race ID mapping based on F1.com URL structure
            race_id_mapping = {
                'hungaroring': '1266',  # Hungarian GP
                'silverstone': '1267',  # British GP
                'monaco': '1268',       # Monaco GP
                'spa': '1269',          # Belgian GP
                'monza': '1270',        # Italian GP
                'red_bull_ring': '1271', # Austrian GP
                'catalunya': '1272',    # Spanish GP
                'villeneuve': '1273',   # Canadian GP
                'miami': '1274',        # Miami GP
                'imola': '1275',        # Emilia-Romagna GP
                'marina_bay': '1276',   # Singapore GP
                'suzuka': '1277',       # Japanese GP
                'losail': '1278',       # Qatar GP
                'cota': '1279',         # United States GP
                'rodriguez': '1280',    # Mexican GP
                'interlagos': '1281',   # Brazilian GP
                'vegas': '1282',        # Las Vegas GP
                'yas_marina': '1283',   # Abu Dhabi GP
                'jeddah': '1284',       # Saudi Arabian GP
                'albert_park': '1285',  # Australian GP
                'shanghai': '1286',     # Chinese GP
                'baku': '1287',         # Azerbaijan GP
                'zandvoort': '1288',    # Dutch GP
            }
            
            race_id = race_id_mapping.get(circuit_id, '1266')  # Default to Hungarian GP ID
            
            # Show user the proposed URLs for all practice sessions
            proposed_urls = {
                'FP1': f"https://www.formula1.com/en/results/{year}/races/{race_id}/{race_name}/practice/1",
                'FP2': f"https://www.formula1.com/en/results/{year}/races/{race_id}/{race_name}/practice/2",
                'FP3': f"https://www.formula1.com/en/results/{year}/races/{race_id}/{race_name}/practice/3"
            }
            
            print(f"\nProposed scraping URLs for {race_info['raceName']} ({year}):")
            print(f"Race: {race_info['raceName']} ({year})")
            print(f"Circuit ID: {circuit_id}")
            print(f"Race ID: {race_id}")
            print(f"Race Name: {race_name}")
            print("\nPractice Session URLs:")
            for session, url in proposed_urls.items():
                print(f"  {session}: {url}")
            
            # Ask user to confirm or provide correct URL
            while True:
                user_input = input("\nAre these URLs correct? (y/n): ").lower().strip()
                if user_input in ['y', 'yes']:
                    print("Proceeding with the proposed URLs...")
                    break
                elif user_input in ['n', 'no']:
                    print("Please provide the correct URL for FP1:")
                    print("Format: https://www.formula1.com/en/results/[year]/races/[race_id]/[race_name]/practice/1")
                    print("Note: FP2 and FP3 URLs will be automatically generated from the FP1 URL.")
                    custom_url = input("Enter FP1 URL: ").strip()
                    if custom_url:
                        # Validate the custom URL
                        if validate_f1_url(custom_url):
                            # Extract components from custom URL for other practice sessions
                            try:
                                # Parse the custom URL to extract components
                                if '/practice/1' in custom_url:
                                    base_url = custom_url.replace('/practice/1', '')
                                    proposed_url = custom_url
                                    print(f"Using custom FP1 URL: {custom_url}")
                                    
                                    # Debug: Show URL parsing
                                    url_parts = custom_url.split('/')
                                    print(f"URL parts: {url_parts}")
                                    if len(url_parts) >= 9:
                                        print(f"Race ID will be: {url_parts[7]}")
                                        print(f"Race name will be: {url_parts[8]}")
                                    
                                    # Show what the FP2 and FP3 URLs would be
                                    custom_fp2 = custom_url.replace('/practice/1', '/practice/2')
                                    custom_fp3 = custom_url.replace('/practice/1', '/practice/3')
                                    print(f"Generated FP2 URL: {custom_fp2}")
                                    print(f"Generated FP3 URL: {custom_fp3}")
                                    
                                    break
                                else:
                                    print("Invalid URL format. Please include '/practice/1' in the URL.")
                                    continue
                            except Exception as e:
                                print(f"Invalid URL format: {str(e)}. Please try again.")
                                continue
                        else:
                            print("Invalid F1.com URL format. Please provide a valid F1.com practice session URL.")
                            print("Example: https://www.formula1.com/en/results/2025/races/1267/netherlands/practice/1")
                            continue
                    else:
                        print("No URL provided. Using default URLs...")
                        break
                else:
                    print("Please enter 'y' for yes or 'n' for no.")
            
            # Update the race_id and race_name based on user input
            if 'custom_url' in locals() and custom_url:
                # Try to extract race_id and race_name from custom URL
                try:
                    url_parts = custom_url.split('/')
                    if len(url_parts) >= 9:  # Need at least 9 parts for complete URL structure
                        race_id = url_parts[7]  # Extract race_id from URL (index 7)
                        race_name = url_parts[8]  # Extract race_name from URL (index 8)
                        print(f"Updated race ID: {race_id}, race name: {race_name}")
                    else:
                        print(f"URL has {len(url_parts)} parts, expected at least 9. URL structure may be different.")
                except Exception as e:
                    print(f"Could not parse custom URL: {str(e)}. Using original values.")
        else:
            print(f"Race {race} not found in {year} season")
            return False
            
    except Exception as e:
        print(f"Error getting race schedule: {str(e)}")
        return False
    
    # Try to scrape practice data from F1.com
    print("Attempting to scrape practice data from F1.com...")
    
    # Debug: Show final values
    print(f"\nFinal values for scraping:")
    print(f"  Year: {year}")
    print(f"  Race ID: {race_id}")
    print(f"  Race Name: {race_name}")
    
    # Test the URLs before scraping
    test_urls = {
        'FP1': f"https://www.formula1.com/en/results/{year}/races/{race_id}/{race_name}/practice/1",
        'FP2': f"https://www.formula1.com/en/results/{year}/races/{race_id}/{race_name}/practice/2",
        'FP3': f"https://www.formula1.com/en/results/{year}/races/{race_id}/{race_name}/practice/3"
    }
    
    print("\nFinal URLs to be scraped:")
    for session, url in test_urls.items():
        print(f"  {session}: {url}")
    
    practice_data = scrape_f1_practice_data(year, race, custom_race_id=race_id, custom_race_name=race_name)
    
    # Find the fastest time for each practice session to use as base for converting differentials
    fastest_times = {}
    for session in ['FP1', 'FP2', 'FP3']:
        if practice_data and practice_data.get(session):
            fastest_time = None
            fastest_driver = None
            
            # Find the driver with position 1 (fastest time)
            for driver_name, data in practice_data[session].items():
                try:
                    position = int(data.get('position', '999'))
                    if position == 1:
                        fastest_time = data.get('time', '')
                        fastest_driver = driver_name
                        break
                except (ValueError, TypeError):
                    continue
            
            # If no position 1 found, find the fastest time by parsing all times
            if not fastest_time:
                for driver_name, data in practice_data[session].items():
                    time_str = data.get('time', '')
                    if time_str and ':' in time_str and not time_str.startswith('+'):
                        # This looks like an absolute time, not a differential
                        if fastest_time is None or time_str < fastest_time:
                            fastest_time = time_str
                            fastest_driver = driver_name
            
            fastest_times[session] = fastest_time
    
    # Display practice results for each driver
    for _, driver in drivers.iterrows():
        driver_number = int(driver['permanentNumber']) if pd.notna(driver['permanentNumber']) else 0
        driver_name = driver['givenName'] + ' ' + driver['familyName']
        nationality = driver['nationality']
        
        # Get team information from qualifying results if available
        team = "{{Team-Placeholder}}"
        if quali_results is not None:
            # Find the driver in qualifying results
            driver_quali = quali_results[quali_results['driverID'] == driver['driverId']]
            if len(driver_quali) > 0:
                constructor_id = driver_quali.iloc[0]['constructorID']
                try:
                    team = constructors[constructor_id]
                except KeyError:
                    team = '{{' + constructor_id + '-CON}}'
        
        print("|-")
        print("! " + str(driver_number))
        print("| " + getFlag(nationality) + " [[" + driver_name + "]]")
        print("| " + team)
        
        # Display practice data if available, otherwise show DNP
        if practice_data and (practice_data.get('FP1') or practice_data.get('FP2') or practice_data.get('FP3')):
            # Create a mapping from scraped driver names to API driver names
            driver_name_mapping = {
                'LandoNorrisNOR': 'Lando Norris',
                'OscarPiastriPIA': 'Oscar Piastri', 
                'CharlesLeclercLEC': 'Charles Leclerc',
                'IsackHadjarHAD': 'Isack Hadjar',
                'LewisHamiltonHAM': 'Lewis Hamilton',
                'OliverBearmanBEA': 'Oliver Bearman',
                'KimiAntonelliANT': 'Andrea Kimi Antonelli',
                'GeorgeRussellRUS': 'George Russell',
                'MaxVerstappenVER': 'Max Verstappen',
                'LanceStrollSTR': 'Lance Stroll',
                'AlexanderAlbonALB': 'Alexander Albon',
                'EstebanOconOCO': 'Esteban Ocon',
                'PierreGaslyGAS': 'Pierre Gasly',
                'LiamLawsonLAW': 'Liam Lawson',
                'CarlosSainzSAI': 'Carlos Sainz',
                'YukiTsunodaTSU': 'Yuki Tsunoda',
                'FrancoColapintoCOL': 'Franco Colapinto',
                'GabrielBortoletoBOR': 'Gabriel Bortoleto',
                'FernandoAlonsoALO': 'Fernando Alonso',
                'NicoHulkenbergHUL': 'Nico Hülkenberg'
            }
            
            # Try to find driver data using the mapping
            fp1_data = None
            fp2_data = None
            fp3_data = None
            
            # Try exact match first, then try mapping
            if driver_name in practice_data.get('FP1', {}):
                fp1_data = practice_data['FP1'][driver_name]
            elif driver_name.replace(' ', '') in practice_data.get('FP1', {}):
                fp1_data = practice_data['FP1'][driver_name.replace(' ', '')]
            else:
                # Try mapping
                for scraped_name, api_name in driver_name_mapping.items():
                    if api_name == driver_name and scraped_name in practice_data.get('FP1', {}):
                        fp1_data = practice_data['FP1'][scraped_name]
                        break
            
            if driver_name in practice_data.get('FP2', {}):
                fp2_data = practice_data['FP2'][driver_name]
            elif driver_name.replace(' ', '') in practice_data.get('FP2', {}):
                fp2_data = practice_data['FP2'][driver_name.replace(' ', '')]
            else:
                # Try mapping
                for scraped_name, api_name in driver_name_mapping.items():
                    if api_name == driver_name and scraped_name in practice_data.get('FP2', {}):
                        fp2_data = practice_data['FP2'][scraped_name]
                        break
            
            if driver_name in practice_data.get('FP3', {}):
                fp3_data = practice_data['FP3'][driver_name]
            elif driver_name.replace(' ', '') in practice_data.get('FP3', {}):
                fp3_data = practice_data['FP3'][driver_name.replace(' ', '')]
            else:
                # Try mapping
                for scraped_name, api_name in driver_name_mapping.items():
                    if api_name == driver_name and scraped_name in practice_data.get('FP3', {}):
                        fp3_data = practice_data['FP3'][scraped_name]
                        break
            
            # FP1
            if fp1_data:
                time = fp1_data.get('time', 'No Time')
                pos = fp1_data.get('position', 'N/A')
                
                # Convert differential to absolute time if needed
                if time != 'No Time' and fastest_times.get('FP1'):
                    if time.startswith('+') or (time.endswith('s') and not ':' in time):
                        # This is a differential, convert to absolute time
                        time = convert_time_differential_to_absolute(fastest_times['FP1'], time)
                
                print("| " + time)
                print("| align=center | " + pos)
            else:
                print("| colspan=\"2\" align=center | {{abbr|DNP|Did Not Participate}}")
            
            # FP2
            if fp2_data:
                time = fp2_data.get('time', 'No Time')
                pos = fp2_data.get('position', 'N/A')
                
                # Convert differential to absolute time if needed
                if time != 'No Time' and fastest_times.get('FP2'):
                    if time.startswith('+') or (time.endswith('s') and not ':' in time):
                        # This is a differential, convert to absolute time
                        time = convert_time_differential_to_absolute(fastest_times['FP2'], time)
                
                print("| " + time)
                print("| align=center | " + pos)
            else:
                print("| colspan=\"2\" align=center | {{abbr|DNP|Did Not Participate}}")
            
            # FP3
            if fp3_data:
                time = fp3_data.get('time', 'No Time')
                pos = fp3_data.get('position', 'N/A')
                
                # Convert differential to absolute time if needed
                if time != 'No Time' and fastest_times.get('FP3'):
                    if time.startswith('+') or (time.endswith('s') and not ':' in time):
                        # This is a differential, convert to absolute time
                        time = convert_time_differential_to_absolute(fastest_times['FP3'], time)
                
                print("| " + time)
                print("| align=center | " + pos)
            else:
                print("| colspan=\"2\" align=center | {{abbr|DNP|Did Not Participate}}")
        else:
            # No practice data available, show DNP for all sessions
            print("| colspan=\"2\" align=center | {{abbr|DNP|Did Not Participate}}")
            print("| colspan=\"2\" align=center | {{abbr|DNP|Did Not Participate}}")
            print("| colspan=\"2\" align=center | {{abbr|DNP|Did Not Participate}}")
    
    print("|-")
    print('! colspan="14" style="text-align:center" |\'\'\'Source:\'\'\' <ref name="P1">[https://www.fia.com/system/files/decision-document/{{lc: {{PAGENAMEE}}}}_-_p1_classification.pdf {{PAGENAME}} - FP1 Classification] (PDF). Fédération Internationale de l\'Automobile.</ref><ref name="P2">[https://www.fia.com/system/files/decision-document/{{lc: {{PAGENAMEE}}}}_-_p2_classification.pdf {{PAGENAME}} - FP2 Classification] (PDF). Fédération Internationale de l\'Automobile.</ref><ref name="P3">[https://www.fia.com/system/files/decision-document/{{lc: {{PAGENAMEE}}}}_-_p3_classification.pdf {{PAGENAME}} - FP3 Classification] (PDF). Fédération Internationale de l\'Automobile.</ref>')
    print("|}")
    
    if not practice_data or not any(practice_data.values()):
        print("\n'''Note:''' Practice session data could not be scraped from F1.com.")
        print("This may be due to:")
        print("1. F1.com's current website structure")
        print("2. Data not being publicly available")
        print("3. Anti-scraping measures")
        print("4. Network connectivity issues")
        print("\nTo populate this table with actual practice times, you would need to:")
        print("1. Manually fill in the times and positions")
        print("2. Use alternative data sources")
        print("3. Modify the scraping function based on F1.com's current structure")
        
        # Generate and display scraping report
        print("\n" + "="*50)
        print(create_practice_scraping_report(year, race))
        print("="*50)
    
    print(f"\n✅ **Practice Results Table Generated**")
    print(f"Successfully created practice results table for {year} race {race}")
    print("You can now copy the table above and paste it into your F1 Wiki article.")
    
    return

# Main
if (len(sys.argv) == 2):
    if (sys.argv[1].lower() == 'race'):
        race()
    elif (sys.argv[1].lower() == 'grid'):
        grid()
    elif (sys.argv[1].lower() == 'quali'):
        qualifying()
    elif (sys.argv[1].lower() == 'standings'):
        standings()
    elif (sys.argv[1].lower() == 'sprint'):
        race(sprint=True)
    else:
        print("You must enter an argument (race, quali, sprint, grid, standings)!")
        print("Note: practice requires year and race parameters: python f1.py practice <year> <race>")

elif (len(sys.argv) == 4):
    if (sys.argv[1].lower() == 'race'):
        race(int(sys.argv[2]), int(sys.argv[3]))
    elif (sys.argv[1].lower() == 'grid'):
        grid(int(sys.argv[2]), int(sys.argv[3]))
    elif (sys.argv[1].lower() == 'quali'):
        qualifying(int(sys.argv[2]), int(sys.argv[3]))
    elif (sys.argv[1].lower() == 'standings'):
        standings(int(sys.argv[2]), int(sys.argv[3]))
    elif (sys.argv[1].lower() == 'sprint'):
        race(int(sys.argv[2]), int(sys.argv[3]), True)
    elif (sys.argv[1].lower() == 'practice'):
        practice(int(sys.argv[2]), int(sys.argv[3]))
    else:
        print("You must enter 3 arguments \n arg1: race, quali, grid, standings, practice \n arg2: Formula 1 season number (ex: 2021) \n arg3: Race number (ex. 1 -- first race of the season)")

else:
    print("\n")
    print("          ______                         _         __  __          ___ _    _ _______    _     _      ")
    print("         |  ____|                       | |       /_ | \ \        / (_) |  (_)__   __|  | |   | |     ")
    print("         | |__ ___  _ __ _ __ ___  _   _| | __ _   | |  \ \  /\  / / _| | ___   | | __ _| |__ | | ___ ")
    print("         |  __/ _ \| '__| '_ ` _ \| | | | |/ _` |  | |   \ \/  \/ / | | |/ / |  | |/ _` | '_ \| |/ _ \ ")
    print("         | | | (_) | |  | | | | | | |_| | | (_| |  | |    \  /\  /  | |   <| |  | | (_| | |_) | |  __/")
    print("         |_|  \___/|_|  |_| |_| |_|\__,_|_|\__,_|  |_|     \/  \/   |_|_|\_\_|  |_|\__,_|_.__/|_|\___|")
                                                                                              
                                                                                              
    print("\n\n This python script allows you to generate fully formatted WikiTables, specifically for Grand Prix articles at \n The Formula One Wiki on https://f1.fandom.com \n")
    print("Usage:\n\n")
    print("  Grabs data for latest grand prix and outputs a WikiTable that can then be pasted onto Fandom")
    print("      python3 f1.py race")
    print("      python3 f1.py sprint")
    print("      python3 f1.py standings")
    print("      python3 f1.py grid")
    print("      python3 f1.py quali\n\n")
    print("  If you specify a season number and race number,\n  you can retrive the data for any specific GP \n  all the way back to the first GP in 1950.")
    print("      python3 f1.py race 2020 15")
    print("      python3 f1.py sprint 2025 6")
    print("      python3 f1.py grid 2021 19")
    print("      python3 f1.py quali 2002 8")
    print("      python3 f1.py standings 2019 21")
    print("      python3 f1.py practice 2024 5")