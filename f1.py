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
        "New Zealander": "{{NZL}}"
}

constructors = {
        "mercedes": "{{GER}} {{Mercedes-CON}}",
        "red_bull": "{{AUT}} {{Red Bull-CON}}",
        "aston_martin": "{{GBR}} {{Aston Martin-Mercedes}}",
        "ferrari": "{{ITA}} {{Ferrari-CON}}",
        "haas": "{{USA}} {{Haas-Ferrari}}",
        "williams": "{{GBR}} {{Williams-Mercedes}}",
        "alphatauri": "{{ITA}} {{AlphaTauri-Red Bull}}",
        "alpine": "{{FRA}} {{Alpine-Renault}}",
        "mclaren": "{{GBR}} {{McLaren-Mercedes}}",
        "alfa": "{{SUI}} {{Alfa Romeo-Ferrari}}",
        "racing_point": "{{GBR}} {{Racing Point-BWT Mercedes}}",
        "renault": "{{FRA}} {{Renault-CON}}"
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

# Grid
def grid(year=None, race=None):
    try:
        q=f1.get_qualifying_result(year, race)
    except:
        print("No data available.")
        return False

    print("===Grid===")
    print('<div class="mw-customtoggle-Grid wds-button wds-is-secondary">Show Grid</div>')
    print('<div class="mw-collapsible mw-collapsed" id="mw-customcollapsible-Grid">')
    print("{{Grid/2-2/34r")
    for a in range(0,len(q)):
        b=q.iloc[a,:]
        nationality=b[4]
        name=b[3]
        number=b[0]
        last_name=name.split(" ")[1]

        try:
            flag=flags[nationality]
        except KeyError:
            flag={{NoFlag}}

        driver = '| ' + flag + ' ' + number + '.' + ' [[' + name + '|' + last_name + ']]' 
        print(driver)
        a += 1

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
    
    # Print table header
    print("""===Qualifying Results===\nThe full qualifying results for the '''{{PAGENAME}}''' are outlined below:\n\n{|class="wikitable" width=100% style="font-size:77%"\n! rowspan=2 width=4% | <span style="cursor:help" title="Position">Pos.</span>\n! rowspan=2 width=5% | <span style="cursor:help" title="Car Number">No.</span>\n! rowspan=2 width=23% | Driver\n! rowspan=2 width=23% | Team\n| rowspan=26 width=1px |\n! colspan=2 width=13% | <span style="cursor:help" title="Qualifying 1">Q1</span>\n| rowspan=26 width=1px |\n! colspan=2 width=13% | <span style="cursor:help" title="Qualifying 2">Q2</span>\n| rowspan=26 width=1px |\n! colspan=2 width=13% | <span style="cursor:help" title="Qualifying 3">Q3</span>\n! rowspan=2 width=5% | Grid\n|-\n! width=4% | <span style="cursor:help" title="Position">Pos.</span>\n! width=9% | Time\n! width=4% | <span style="cursor:help" title="Position">Pos.</span>\n! width=9% | Time\n! width=4% | <span style="cursor:help" title="Position">Pos.</span>\n! width=9% | Time""")
    for a in range(0, len(q)):
        # Get and assign data
        b=q.iloc[a,:]
        
        try:
            team=constructors[b[5]]
        except KeyError:
            team='{{' + b[5] + '-CON}}'

        try:
            driver=flags[b[4]] + ' [[' + b[3] + ']]'
        except:
            driver='[[' + b[3] + ']]'

        number=b[0]
        pos=b[1]

        # Print table
        if (a == 10 or a == 15):
            print('|-\n|colspan=14 style="border-bottom:hidden"|\n|-\n|colspan=14|\n|-')
        else:
            print("|-")

        print("! " + pos)
        print("| align=center | " + number)
        print("| " + driver)
        print("| " + team)

        # Q1
        if (a >= 15): # Q3 (16-20) position locked
            print("! " + pos)
        else: # Calculate position for P15+
            for y in range(0,len(sort_Q1)):
                q1=sort_Q1.iloc[y,:]
                if (q1[0] == number):
                    print("! " + str(1+y))
                if (y == 0):
                    fastestQ1 = q1[0]

        if (fastestQ1 == number):
            print("| '''" + str(b[7]) + "'''")
            OneZeroSeven = str(b[7])
        else:
            print("| " + str(b[7]))
        
        # Q2
        if (str(b[8]) != "nan"):
            if (a >= 10 and a <= 14): # Q2 (11-15) position locked
                print("! " + pos)
            else: # Calculate position for P10+
                for x in range(0,len(sort_Q2)):
                    q2=sort_Q2.iloc[x,:]
                    if (q2[0] == number):
                        print("! " + str(1+x))
                    if (x == 0):
                        fastestQ2 = q2[0]

            if (fastestQ2 == number):
                print("| '''" + str(b[8]) + "'''")
            else:
                print("| " + str(b[8]))
        elif (a == 15):
            print('! rowspan="5" |')
            print('| rowspan="5" |')
            print('! rowspan="5" |')
            print('| rowspan="5" |')

        # Q3
        if (str(b[9]) != "nan"):
            print("! " + pos)
            if (a == 0):
                print("| '''" + str(b[9]) + "'''")
            else:
                print("| " + str(b[9]))
        elif (a == 10):
            print('! rowspan="5" |')
            print('| rowspan="5" |')

        # Grid
        print("! " + pos)

    print("|-")
    print("! colspan=14 | [[107% Time]]: " + find_107_time(OneZeroSeven))
    print("|-")
    print("! colspan=14 | Source:<ref name=QR>{{PAGENAME}} - Qualifying, ''https://www.formula1.com/en/results.html/2022/races/1117/hungary/qualifying.html'', (Formula One World Championship Limited, 2022. Retrieved on 7 May 2022)</ref>")
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
        print("""===Results===\nThe full Sprint results for the '''{{PAGENAME}}''' are outlined below:\n{| class="wikitable"\n! <span style="cursor:help;" title=" Position">Pos.</span>\n! <span style="cursor:help;" title=" Car number">No.</span>\n! Driver\n! Constructor\n! <span style="cursor:help;" title=" Laps completed">Laps</span>\n! <span style="cursor:help;" title=" Time for winner, time or number laps behind leader or reason for retirement">Time/Retired</span>\n! <span style="cursor:help;" title=" Grid position">Grid</span>\n! <span style="cursor:help;" title=" Points gained from race">Points</span>""")
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
        if (points != '0'):
            if (points == '26') or (points == '19') or (points == '16') or (points == '13') or (points == '11') or (points == '9') or (points == '7') or (points == '5') or (points == '3'):
                print("! " + points + "<sup>{{abbr|[[Fastest lap|FL]]|+1 point for achieving the fastest lap}}</sup>")
            elif (points == '2') and (pos == '10'):
                print("! " + points + "<sup>{{abbr|[[Fastest lap|FL]]|+1 point for achieving the fastest lap}}</sup>")
            else:
                print("! " + points)
        if (x == 10):
            print("! rowspan=10 |")

    print('|-')
    if (sprint):
        print('''! colspan="8" | Source:<ref name=Sprint Results>[https://www.fia.com/sites/default/files/decision-document/{{urlencode: {{PAGENAME}} |PATH}}%20-%20Final%20Sprint%20Classification.pdf {{PAGENAME}} - Final Sprint Classification] (PDF). Fédération Internationale de l'Automobile.</ref>''')
    else:
        print('''! colspan="8" | Source:<ref name=Race Results>[https://www.fia.com/sites/default/files/decision-document/{{urlencode: {{PAGENAME}} |PATH}}%20-%20Final%20Race%20Classification.pdf {{PAGENAME}} - Final Race Classification] (PDF). Fédération Internationale de l'Automobile.</ref>''')
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
        try:
            driver=flags[y[6]] + ' [[' + y[5] + ']]'
        except KeyError:
            driver='[[' + y[5] + ']]'
        
        if (pts != '0'):
            print("|-")
            if (pos == '1'):
                print("| {{1st}}")
                print("| '''" + driver + "'''")
                print("| '''" + pts + "'''")
                print("| {{X}}") # TODO: automate comparison to previous GP
            elif (pos == '2'):
                print("| {{2nd}}")
                print("| " + driver)
                print("| " + pts)
                print("| {{X}}") # TODO: automate comparison to previous GP
            elif (pos == '3'):
                print("| {{3rd}}")
                print("| " + driver)
                print("| " + pts)
                print("| {{X}}") # TODO: automate comparison to previous GP
            else:    
                print("| " + pos + "th")
                print("| " + driver)
                print("| " + pts)
                print("| {{X}}") # TODO: automate comparison to previous GP

    # end table
    print("|}\n")
    print('''<p style="text-align:center;">''Only point-scoring drivers are shown.''</p>''')

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
        try:
            team=constructors[z[4]]
        except KeyError:
            team='{{' + y[5] + '-CON}}'
        
        if (pts != '0'):
            print("|-")
            if (pos == '1'):
                print("| {{1st}}")
                print("| '''" + team + "'''")
                print("| '''" + pts + "'''")
                print("| {{X}}") # TODO: automate comparison to previous GP
            elif (pos == '2'):
                print("| {{2nd}}")
                print("| " + team)
                print("| " + pts)
                print("| {{X}}") # TODO: automate comparison to previous GP
            elif (pos == '3'):
                print("| {{3rd}}")
                print("| " + team)
                print("| " + pts)
                print("| {{X}}") # TODO: automate comparison to previous GP
            else:    
                print("| " + pos + "th")
                print("| " + team)
                print("| " + pts)
                print("| {{X}}") # TODO: automate comparison to previous GP

    # end table
    print("|}")
    print("{{Col-end}}")
    return

# Main
if (len(sys.argv) == 2):
    if (sys.argv[1] == 'race'):
        race()
    elif (sys.argv[1] == 'grid'):
        grid()
    elif (sys.argv[1] == 'quali'):
        qualifying()
    elif (sys.argv[1] == 'standings'):
        standings()
    elif (sys.argv[1] == 'sprint'):
        race(sprint=True)
    else:
        print("You must enter an argument (race, quali, sprint, grid, standings)!")

elif (len(sys.argv) == 4):
    if (sys.argv[1] == 'race'):
        race(int(sys.argv[2]), int(sys.argv[3]))
    elif (sys.argv[1] == 'grid'):
        grid(int(sys.argv[2]), int(sys.argv[3]))
    elif (sys.argv[1] == 'quali'):
        qualifying(int(sys.argv[2]), int(sys.argv[3]))
    elif (sys.argv[1] == 'standings'):
        standings(int(sys.argv[2]), int(sys.argv[3]))
    elif (sys.argv[1] == 'sprint'):
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
    print("      python3 f1v2.py race")
    print("      python3 f1v2.py standings")
    print("      python3 f1v2.py grid")
    print("      python3 f1v2.py quali\n\n")
    print("  If you specify a season number and race number,\n  you can retrive the data for any specific GP \n  all the way back to the first GP in 1950.")
    print("      python3 f1v2.py race 2020 15")
    print("      python3 f1v2.py grid 2021 19")
    print("      python3 f1v2.py quali 2002 8")
    print("      python3 f1v2.py standings 2019 21")

