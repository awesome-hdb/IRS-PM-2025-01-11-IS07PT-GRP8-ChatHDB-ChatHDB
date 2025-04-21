import pandas as pd

# Load CSV
df = pd.read_csv("Resale flat prices based on registration date from Jan-2017 onwards with rental records.csv")

# Define formulas per flat type
def estimate_rent(row):
    flat_type = row['flat_type']
    resale_price = row['resale_price']
    floor_area = row['floor_area_sqm']
    storey = row['storey_range']

    if flat_type == '3 ROOM':
        rent = 2457.61 - 19.41 * floor_area + 0.0036 * resale_price
        # Adjustments based on storey_range
        if storey == '04 TO 06': rent += -44.66
        elif storey == '07 TO 09': rent += -64.82
        elif storey == '10 TO 12': rent += -65.12
        # ... add other storey ranges if needed
    elif flat_type == '4 ROOM':
        rent = 1831.40 - 4.39 * floor_area + 0.0025 * resale_price
        if storey == '04 TO 06': rent += -48.40
        elif storey == '07 TO 09': rent += -86.10
        elif storey == '10 TO 12': rent += -106.23
        # ... add other storey ranges if needed
    else:
        rent = resale_price * 0.002 + 1500  # fallback rule for other types

    return round(rent, 2)

# Apply to DataFrame
df['estimated_rent'] = df.apply(estimate_rent, axis=1)

# Save updated CSV
df.to_csv("merged_union_with_rent.csv", index=False)

print("✅ Rent estimates added and CSV updated successfully!")