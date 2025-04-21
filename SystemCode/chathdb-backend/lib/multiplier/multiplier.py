import pandas as pd
import numpy as np
import os

# Load the parquet files
script_dir = os.path.dirname(__file__)
gnews_df = pd.read_parquet(script_dir + "/../../static/data/gnews/parsed/aggregated_gnews_scores.parquet")
econ_df = pd.read_parquet(script_dir + "/../../static/data/economic_data/parsed/consolidated_economic_data.parquet")
gtrend_df = pd.read_parquet(script_dir + "/../../static/data/gtrends/parsed/consolidated_gtrends.parquet")

# Normalize function
def normalize(series, lower=-0.03, upper=0.03):
    if series.min() == series.max():
        return pd.Series([0.0] * len(series), index=series.index)
    return (lower + (series - series.min()) / (series.max() - series.min()) * (upper - lower)).round(6)

# Time decay function
def apply_time_decay(df, date_col):
    min_date = df[date_col].min()
    df["months_since_start"] = ((df[date_col] - min_date).dt.days // 30).astype(int)
    df["decay_weight"] = 1 / (1 + df["months_since_start"])  # inversely proportional
    return df

# Convert date columns
gnews_df["month"] = pd.to_datetime(gnews_df["month"])
gtrend_df["month"] = pd.to_datetime(gtrend_df["month"])
econ_df["month"] = pd.to_datetime(econ_df["month"])

# GNews Adjustment
gnews_df = apply_time_decay(gnews_df, "month")
gnews_df["weighted_score"] = (gnews_df["aggregated_score"] + gnews_df["mean_score"]) * gnews_df["decay_weight"]
gnews_adj = gnews_df.groupby("town")["weighted_score"].mean().reset_index()
gnews_adj["adj_factor_gnews"] = normalize(gnews_adj["weighted_score"]).fillna(0.0).round(6)

# GTrend Adjustment
gtrend_df = apply_time_decay(gtrend_df, "month")
gtrend_df["weighted_score"] = gtrend_df["gtrend_value"] * gtrend_df["decay_weight"]
gtrend_adj = gtrend_df.groupby("town")["weighted_score"].mean().reset_index()
gtrend_adj["adj_factor_gtrend"] = normalize(gtrend_adj["weighted_score"]).fillna(0.0).round(6)

# Economic Adjustment (same for all towns)
latest_econ = econ_df.sort_values("month").iloc[-1]
econ_score = latest_econ["cpi"] + latest_econ["gdp"] - latest_econ["unemployment"]
adj_factor_econ = round(normalize(pd.Series([econ_score]))[0], 6)

# Step 1: Compute composite score for each month
econ_df["econ_score"] = econ_df["cpi"] + econ_df["gdp"] - econ_df["unemployment"]

# Step 2: Normalize across months
econ_df["adj_factor_econ"] = normalize(econ_df["econ_score"])

# Step 3: Take the latest normalized score
latest_month = econ_df["month"].max()
latest_adj_econ = econ_df.loc[econ_df["month"] == latest_month, "adj_factor_econ"].values[0]

# Step 4: Apply this value to all towns
all_towns = sorted(set(gnews_adj["town"]).union(set(gtrend_adj["town"])))
econ_df_final = pd.DataFrame({
    "town": all_towns,
    "adj_factor_econ": latest_adj_econ
})

# Merge all into one final dataframe
final_df = pd.merge(gnews_adj[["town", "adj_factor_gnews"]],
                    gtrend_adj[["town", "adj_factor_gtrend"]],
                    on="town", how="outer")
final_df = pd.merge(final_df, econ_df_final, on="town", how="left")

# Save to CSV
final_df.to_csv(script_dir + "/../../static/data/multiplier/adjustment_factors_by_town_final.csv", index=False)
print("✅ Saved to adjustment_factors_by_town_final.csv")