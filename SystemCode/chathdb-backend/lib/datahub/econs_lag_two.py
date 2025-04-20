import os
import polars as pl

script_dir = os.path.dirname(__file__)
economic_file_name = script_dir + '/../../static/data/economic_data/parsed/consolidated_economic_data.parquet'
resale_price_file_name = script_dir + '/../../static/data/resale_price/parsed/consolidated_resale.parquet'
output_filepath = script_dir + '/../../static/data/conso/raw/conso_data_lagged.parquet'

economic_df = pl.scan_parquet(economic_file_name)
resale_df = pl.scan_parquet(resale_price_file_name).sort(by='month', descending=True)

lagged_economic_df = (
    economic_df
    .with_columns(
        (
            (pl.col("month").str.extract(r'^(\d{4})').cast(pl.Int32) + 2).cast(pl.Utf8)
            + "-" 
            + pl.col("month").str.extract(r'-(\d{2})$')
        ).alias("month_lagged")
    )
    .with_columns(
        pl.col("cpi").alias("cpi_lag_2y"),
        pl.col("gdp").alias("gdp_lag_2y"),
        pl.col("unemployment").alias("unemployment_lag_2y")
    )
    .select([
        pl.col("month_lagged").alias("month"),
        "cpi_lag_2y",
        "gdp_lag_2y",
        "unemployment_lag_2y"
    ])
)

conso_df = resale_df.join(
    lagged_economic_df, on='month', how='left', coalesce=True
    ).collect()

conso_df.write_parquet(output_filepath)

# Verify file content
outputDf = pl.read_parquet(output_filepath)
print(outputDf)