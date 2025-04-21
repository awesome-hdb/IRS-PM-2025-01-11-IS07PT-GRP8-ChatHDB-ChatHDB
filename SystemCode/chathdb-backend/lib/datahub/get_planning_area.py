import requests
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

year = 2024 # Change this to the desired year for planning area data

script_dir = os.path.dirname(__file__) # absolute dir the script is in
folder_path = script_dir + '/../../static/data/planning_area/raw'
file_name = f'{folder_path}/planning_area_{year}'

url = f'https://www.onemap.gov.sg/api/public/popapi/getAllPlanningarea?year={year}'

auth_key = os.getenv("ONEMAP_AUTH_KEY")

headers = {'Authorization': auth_key}
    
response = requests.request('GET', url, headers=headers)
    
data = pd.DataFrame(response.json()['SearchResults'])

if not [file for file in os.listdir(folder_path) if f'planning_area_{year}' in file]:
    data.to_csv(f'{file_name}.csv', index=False)
    print(f'Planning area data for {year} saved as {file_name}.csv')
else:
    cnt = 1
    while os.path.exists(f'{file_name}({cnt}).csv'):
        cnt += 1

    data.to_csv(f'{file_name}({cnt}).csv', index=False)
    print(f'Planning area data for {year} saved as {file_name}({cnt}).csv')

data.to_csv(f'{file_name}_final.csv', index=False)
print(f'Saved final planning area data for {year} as {file_name}_final.csv')