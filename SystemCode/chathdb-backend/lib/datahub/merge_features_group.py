import os
import polars as pl

script_dir = os.path.dirname(__file__)
economic_file_name = script_dir + '/../../static/data/economic_data/parsed/consolidated_economic_data.parquet'
resale_price_file_name = script_dir + '/../../static/data/resale_price/parsed/consolidated_resale.parquet'
output_filepath = script_dir + '/../../static/data/conso/raw/conso_data.parquet'

economic_df = pl.scan_parquet(economic_file_name)
resale_df = pl.scan_parquet(resale_price_file_name).sort(by='month', descending=True)


conso_df = resale_df.join(
    economic_df, on='month', how='left', coalesce=True
    ).with_columns(
        pl.col(['cpi', 'gdp', 'unemployment']).fill_null(strategy="backward")
        ).collect()

conso_df.write_parquet(output_filepath)

# Verify file content
outputDf = pl.read_parquet(output_filepath)
print(outputDf)