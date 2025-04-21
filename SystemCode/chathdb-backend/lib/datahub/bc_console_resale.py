import polars as pl
import os

script_dir = os.path.dirname(__file__)
conso_file = script_dir + '/../../static/data/resale_price/parsed/consolidated_resale.parquet'


df = pl.scan_parquet(
    conso_file,
        ).with_columns(
            pl.col('month').str.split('-').list.first().alias('year')
            ).group_by(
                ['year']
                ).agg(
                    pl.col('resale_price').sum().alias('total_resale_value'),
                    pl.col('resale_price').mean().alias('average_resale_price'),
                    pl.col('resale_price').median().alias('median_resale_price'),
                    pl.col('resale_price').count().alias('total_resale_count')
                    ).sort(
                        'year', descending=True
                        ).with_columns(
                            pl.col('year').cast(pl.Int16()),
                            pl.col('total_resale_value').cast(pl.Float64()),
                            pl.col('average_resale_price').cast(pl.Float64()),
                            pl.col('median_resale_price').cast(pl.Float64()),
                            pl.col('total_resale_count').cast(pl.Int32())
                            ).with_columns(
                                (pl.col('total_resale_value') / pl.col('total_resale_value').shift(-1) -1).alias('resale_price_growth')
                                )
print(df.head(11).tail(10).collect())

cagr_20y = ((df.select(pl.col('total_resale_value').filter(pl.col('year') == 2024).first()).collect() / df.select(pl.col('total_resale_value').filter(pl.col('year') == 2004).first()).collect() )[0,0] ** (1/20)) - 1
print(f"20-year CAGR: {cagr_20y:.2%}")