#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import pyergast as f1
import pandas as pd

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
    else:
        print("You must enter 3 arguments \n arg1: race, quali, grid, standings \n arg2: Formula 1 season number (ex: 2021) \n arg3: Race number (ex. 1 -- first race of the season)")

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