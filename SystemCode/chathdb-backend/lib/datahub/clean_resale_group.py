import polars as pl
import glob
import os

# Read and combine all CSV files in the ResaleFlatPrices folder
assumed_lease_period = 99 # assume all flats have 99 years lease

script_dir = os.path.dirname(__file__)
folder_path = script_dir + '/../../static/data/resale_price/raw'
output_file = script_dir + '/../../static/data/resale_price/parsed/consolidated_resale.parquet'
all_files = glob.glob(os.path.join(folder_path, "*.csv"))

dtype_dict = {
    'month': pl.Utf8,
    'town': pl.Utf8,
    'flat_type': pl.Utf8,
    'block': pl.Utf8,
    'street_name': pl.Utf8,
    'storey_range': pl.Utf8,
    'floor_area_sqm': pl.Float32,
    'flat_model': pl.Utf8,
    'lease_commence_date': pl.Int32,
    'resale_price': pl.Float32,
}

df_list = []
for file in all_files:
    df = pl.scan_csv(
        file,
        schema_overrides=dtype_dict,
    ).select(
        list(dtype_dict.keys())
        ).with_columns(
            [(assumed_lease_period - (pl.col('month').str.split('-').list.first().str.to_integer() - pl.col('lease_commence_date'))).alias('remaining_lease')]
        )
    
    df_list.append(df)

conso_df = pl.concat(df_list).collect()
conso_df.write_parquet(output_file)

if os.path.exists(output_file):
    print(f"Consolidated resale data saved as parquet file: {output_file}")
else:
    print("Error saving consolidated resale data")