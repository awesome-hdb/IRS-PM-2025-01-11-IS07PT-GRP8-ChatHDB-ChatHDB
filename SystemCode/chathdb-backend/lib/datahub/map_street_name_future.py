import csv
import json
import os

# Path to the CSV file
script_dir = os.path.dirname(__file__) # absolute dir the script is in
csv_file_path = script_dir + '/../../static/models/X_single_test_data_future.csv'

# Path to save the JSON file
json_file_path = script_dir + '/../../static/model/data/future_cols_street_name.json'

# Read the CSV file and extract street names
with open(csv_file_path, mode='r') as csv_file:
    reader = csv.reader(csv_file)
    header = next(reader)  # Get the header row
    street_names = [col for col in header if col.startswith('street_name_')]

# Create a mapping of index to street name
street_name_mapping = {name: idx for idx, name in enumerate(street_names)}

# Save the mapping to a JSON file
os.makedirs(os.path.dirname(json_file_path), exist_ok=True)
with open(json_file_path, mode='w') as json_file:
    json.dump(street_name_mapping, json_file, indent=4)