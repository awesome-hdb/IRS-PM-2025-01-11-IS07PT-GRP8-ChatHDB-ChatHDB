import pandas as pd

# Load CSV
df = pd.read_csv("Resale flat prices based on registration date from Jan-2017 onwards with rental records.csv")

# Average salary data
salary_data = {
    2012: 4433, 2013: 4622, 2014: 4727, 2015: 4892, 2016: 5074,
    2017: 5229, 2018: 5410, 2019: 5549, 2020: 5629, 2021: 5832,
    2022: 6227, 2023: 6555, 2024: 6908,
}

# Clean and extract year
df = df[df['month'].str.len() >= 7]
df['year'] = pd.to_datetime(df['month'], errors='coerce').dt.year
df = df.dropna(subset=['year'])
df['average_salary'] = df['year'].astype(int).map(salary_data)

# Convert remaining lease to months
def lease_to_months(lease_str):
    try:
        years, months = 0, 0
        if 'year' in lease_str:
            years = int(lease_str.split('years')[0].strip())
        if 'month' in lease_str:
            months = int(lease_str.split('years')[-1].split('month')[0].strip())
        return years * 12 + months
    except:
        return 0

df['lease_months'] = df['remaining_lease'].apply(lease_to_months)

# Updated rent estimation formula (without resale_price)
def estimate_rent(row):
    if pd.isna(row['average_salary']) or pd.isna(row['floor_area_sqm']):
        return None  # Return None if missing critical fields
    
    base = 0.25 * row['average_salary']
    area_factor = 8 * row['floor_area_sqm']
    lease_factor = row['lease_months'] * 0.3
    adjustment = 0
    if row['flat_type'] == '3 ROOM':
        adjustment = -100
    elif row['flat_type'] == '4 ROOM':
        adjustment = 50
    elif row['flat_type'] == '5 ROOM':
        adjustment = 150
    elif row['flat_type'] == 'EXECUTIVE':
        adjustment = 250
    return round(base + area_factor + lease_factor + adjustment, 2)

# Apply formula
df['estimated_rent'] = df.apply(estimate_rent, axis=1)

# Fallback: Use existing monthly_rent if estimated_rent is missing
df['final_rent'] = df['estimated_rent'].combine_first(df['monthly_rent'])

# Save updated CSV
df.to_csv("rental_price_no_resale.csv", index=False)

print("✅ Rental price estimation (without resale price) completed! File saved as 'rental_price_no_resale.csv'.")