import pandas as pd
import os

year = 2024

# Read the planning area data
script_dir = os.path.dirname(__file__) # absolute dir the script is in
folder_path = script_dir + '/../../static/data/planning_area/raw'

data = pd.read_csv(f'{folder_path}/planning_area_{year}_final.csv')

# output
file_name = f'{folder_path.split("/raw")[0]}/planning_area_{year}.parquet'
data.to_parquet(file_name, index=False)
print(f'Planning area data for {year} saved as {file_name}')