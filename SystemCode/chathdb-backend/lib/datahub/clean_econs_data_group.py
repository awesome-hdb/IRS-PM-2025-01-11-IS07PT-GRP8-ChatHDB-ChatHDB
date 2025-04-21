import os
import pandas as pd
import polars as pl

script_dir = os.path.dirname(__file__)
cpi_file_name = script_dir + '/../../static/data/economic_data/raw/cpi.csv'
gdp_file_name = script_dir + '/../../static/data/economic_data/raw/gdp.csv'
unemployment_file_name = script_dir + '/../../static/data/economic_data/raw/unemployment_rate.csv'
output_filepath = script_dir + '/../../static/data/economic_data/parsed/consolidated_economic_data.parquet'

quarter_to_month = {
    "1Q": "03",
    "2Q": "06",
    "3Q": "09",
    "4Q": "12"
}

# clean cpi data
cpi_df = pd.read_csv(cpi_file_name, skiprows=9, nrows=500)
cpi_df.rename(columns={'Data Series': 'month', 'All Items (Index)': 'cpi'}, inplace=True)
cpi_df.replace('na', None, inplace=True)
cpi_pldf = pl.from_dataframe(
    cpi_df[['month', 'cpi']]
    ).with_columns(
        pl.col('month').str.strip_chars().str.strptime(pl.Date, "%Y %b").dt.strftime("%Y-%m")
    )

# clean gdp data
gdp_df = pd.read_csv(gdp_file_name, skiprows=9, nrows=190)
gdp_df.rename(columns={'Data Series': 'month', 'GDP At Current Market Prices (Per Cent)': 'gdp'}, inplace=True)
gdp_df["month"] = (
    gdp_df["month"].str.strip().str.split(" ")
    .apply(lambda x: f"{x[0]}-{quarter_to_month[x[1]]}")
)
gdp_pldf = pl.from_dataframe(
    gdp_df[['month', 'gdp']]
    )

# clean unemployement data
unemployment_df = pd.read_csv(unemployment_file_name, skiprows=9, nrows=131)
unemployment_df.rename(columns={'Data Series': 'month', 'Total Unemployment Rate (Per Cent)': 'unemployment'}, inplace=True)
unemployment_df["month"] = (
    unemployment_df["month"].str.strip().str.split(" ")
    .apply(lambda x: f"{x[0]}-{quarter_to_month[x[1]]}")
)
unemployment_pldf = pl.from_dataframe(
    unemployment_df[['month', 'unemployment']]
    )

conso_df = cpi_pldf.join(
    gdp_pldf, on='month', how='full', coalesce=True
    ).join(
        unemployment_pldf, on='month', how='full', coalesce=True
        ).sort(
            by='month', descending=True
            ).with_columns(
                pl.col(['cpi', 'gdp', 'unemployment']).fill_null(strategy="backward")
                )

conso_df.write_parquet(output_filepath)

# Verify file content
outputDf = pl.read_parquet(output_filepath)
print(outputDf)