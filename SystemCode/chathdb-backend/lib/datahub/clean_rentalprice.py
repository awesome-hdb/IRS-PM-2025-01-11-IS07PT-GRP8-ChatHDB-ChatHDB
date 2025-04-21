import os
import polars as pl

# Read the planning area data
script_dir = os.path.dirname(__file__) # absolute dir the script is in
file_path = script_dir + '/../../static/data/rental_amount/raw/RentingOutofFlats2025.csv'
output_filepath = script_dir + '/../../static/data/rental_amount/RentingOutofFlats2025.parquet'

dtype_dict = {
    'rent_approval_date': pl.Utf8,  # string
    'town': pl.Utf8,               # string
    'block': pl.Utf8,             # string
    'street_name': pl.Utf8,       # string
    'flat_type': pl.Utf8,         # string
    'monthly_rent': pl.Float32    # float
}

data = pl.scan_csv(
    file_path, schema_overrides=dtype_dict
    ).with_columns(
        pl.col("flat_type").str.replace_all("-", " ")
        ).group_by(
            ["rent_approval_date", "town", "block", "street_name", "flat_type"]
            ).agg(
                pl.col("monthly_rent").median().alias("median_monthly_rent")
                )

data.collect().write_parquet(output_filepath)

outputDf = pl.read_parquet(output_filepath)
print(outputDf)
