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
clean_folder_path = script_dir + '/../../static/data/gnews/clean'
output_folder_path = script_dir + '/../../static/data/gnews/parsed'
output_filepath = os.path.join(output_folder_path, 'consolidated_gnews.parquet')

resale_file = script_dir + '/../../static/data/resale_price/parsed/consolidated_resale.parquet'
resale_town_list = pl.scan_parquet(resale_file).select("town").unique().collect()["town"].to_list()


error_list = []
result = []

# Get all town names
town_id_map = {}
for key, towns in town_mapping.items():
    for town in towns:
        town_id_map[town] = key

# Process all parquet files in the folder
for filename in os.listdir(clean_folder_path):
    if filename.endswith(f'.parquet'):
        try:
            # Extract town and year from filename
            raw_town = filename.replace('.parquet', '')
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
                ).with_columns([
                    (pl.lit(town).alias("town")),
                    (pl.col("pubDate").dt.strftime("%Y-%m").alias("month"))
                    ]).select(
                        ["title", "month", "town"]
                    )

            result.append(df)
            
            # Store the DataFrame with town as key
            print(f"Processed {raw_town}")

        except Exception as e:
            error_list.append([filename, str(e)])

print(f"Number of errors: {len(error_list)}")
if error_list:
    for error in error_list:
        print(error)

gnews_df = pl.concat(result).collect()
gnews_df.write_parquet(output_filepath)

# Verify file content
outputDf = pl.read_parquet(output_filepath)
print(outputDf)