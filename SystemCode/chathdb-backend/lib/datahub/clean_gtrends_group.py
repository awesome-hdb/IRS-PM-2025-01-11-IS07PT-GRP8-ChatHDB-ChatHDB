import os
import polars as pl

town_mapping = {
    "CENTRAL AREA": [
        "SINGAPORE RIVER",
        "ROCHOR",
        "MUSEUM",
        "DOWNTOWN CORE",
        "RIVER VALLEY",
        "ORCHARD",
        "NEWTON",
        "OUTRAM",
        "MARINA SOUTH",
    ],
    "KALLANG/WHAMPOA": [
        "KALLANG",
        "WHAMPOA",
    ],
}

script_dir = os.path.dirname(__file__)
folder_path = script_dir + '/../../static/data/gtrends/'
clean_folder_path =  os.path.join(folder_path, 'raw_parquet/')
output_folder_path = os.path.join(folder_path, 'parsed/')
output_filepath = os.path.join(output_folder_path, 'consolidated_gtrends.parquet')

resale_folder_path = script_dir + '/../../static/data/resale_price'
resale_files = [os.path.join(resale_folder_path, f) for f in os.listdir(resale_folder_path) if f.endswith('.csv') \
                and 'based on registration date' in f.lower()]

resale_town_list = pl.concat(
    [pl.scan_csv(f).select("town") for f in resale_files]
    ).unique().collect()["town"].to_list()


error_list = []
result = []

# Get all town names
town_id_map = {}
for key, towns in town_mapping.items():
    for town in towns:
        town_id_map[town] = key

# Process all parquet files in the folder
for filename in os.listdir(clean_folder_path):
    if filename.endswith('.parquet'):
        try:
            # Extract town from filename
            raw_town = filename.split('.')[0]
            if raw_town in town_id_map:
                town = town_id_map[raw_town]
            else:
                town = raw_town

            # Skip if town is not in resale_town_list
            if town not in resale_town_list:
                continue

            # Read the parquet file
            file_path = os.path.join(clean_folder_path, filename)
            df = pl.scan_parquet(
                file_path
                ).with_columns(
                    (pl.lit(town).alias("town")),
                    (pl.col("formattedTime").str.replace_all("Sept", "Sep").str.strptime(pl.Date, "%b %Y").dt.strftime("%Y-%m"))
                    ).select(
                        ["value", "town", "formattedTime"]
                        ).rename({"value": "gtrend_value", "formattedTime": "month"})
            
            result.append(df)
            
            # Store the DataFrame with town as key
            print(f"Processed {raw_town}")

            
        except Exception as e:
            error_list.append([filename, str(e)])

print(f"Number of errors: {len(error_list)}")
if error_list:
    for error in error_list:
        print(error)

gtrend_df = pl.concat(result).collect()


gtrend_df.write_parquet(output_filepath)

# Verify file content
outputDf = pl.read_parquet(output_filepath)
print(outputDf)