import os
import json
import polars as pl

def clean_gtrends(data: json) -> pl.DataFrame:
    data = pl.DataFrame(data)
    data = data.with_columns([
        pl.col("time").str.to_integer(),
        pl.col("value").list.first(),
        pl.col("hasData").list.first(),
        pl.col("formattedValue").list.first(),
    ])
    return data

# Read the planning area data
script_dir = os.path.dirname(__file__) # absolute dir the script is in
raw_folder_path = script_dir + '/../../static/data/gtrends/raw'
clean_folder_path = script_dir + '/../../static/data/gtrends/raw_parquet'
raw_file_list = [raw_folder_path + '/' + file for file in os.listdir(raw_folder_path) if file.endswith('.csv')]
clean_file_list = [clean_folder_path + '/' + file.replace(".csv", ".parquet") for file in os.listdir(raw_folder_path) if file.endswith(f'.csv')]
file_dict = dict(zip(raw_file_list, clean_file_list))
error_list = []
for raw_file, clean_file in file_dict.items():
    try:
        with open(raw_file, 'r', encoding='utf-8') as f:
            data = f.read()
            data = json.loads(data.split(")]}\',\n")[1])["default"]["timelineData"]
            data = clean_gtrends(data)
            data.write_parquet(clean_file)
    except Exception as e:
        error_list.append([raw_file, e])

print(f"Number of errors: {len(error_list)}")
if error_list:
    for error in error_list:
        print(error)

print(f'GTrends data saved as parquet files in {clean_folder_path}')
