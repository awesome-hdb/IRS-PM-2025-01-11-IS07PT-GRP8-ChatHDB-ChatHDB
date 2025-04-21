import os
import xml.etree.ElementTree as ET
import polars as pl

def clean_gnews(df: pl.DataFrame) -> pl.DataFrame:
    clean_df = df.with_columns([
        pl.col("pubDate")
        .str.replace(' GMT', 'Z')
        .str.strptime(pl.Datetime, "%a, %d %b %Y %H:%M:%S%#z")
    ])
    return clean_df


# Read the planning area data
script_dir = os.path.dirname(__file__) # absolute dir the script is in
raw_folder_path = script_dir + '/../../static/data/gnews/raw'
clean_folder_path = script_dir + '/../../static/data/gnews/clean'
raw_file_list = [raw_folder_path + '/' + file for file in os.listdir(raw_folder_path) if file.endswith('.xml')]
clean_file_list = [clean_folder_path + '/' + file.replace(".xml", ".parquet") for file in os.listdir(raw_folder_path) if file.endswith('.xml')]
file_dict = dict(zip(raw_file_list, clean_file_list))
error_list = []
for raw_file, clean_file in file_dict.items():
    try:
        tree = ET.parse(raw_file)
        root = tree.getroot()

        data = []
        for child in root.find('channel').findall('item'):
            # get all the tags and their values
            item = {}
            for tag in child:
                item[tag.tag] = tag.text
            data.append(item)
        df = pl.DataFrame(data)
        cleaned_df = clean_gnews(df)
        cleaned_df.write_parquet(clean_file)
        
    except Exception as e:
        error_list.append([raw_file, e])

print(f"Number of errors: {len(error_list)}")
if error_list:
    for error in error_list:
        print(error)

print(f'GNews data for saved as parquet files in {clean_folder_path}')
