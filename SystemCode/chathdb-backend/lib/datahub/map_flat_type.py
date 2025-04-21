import csv
import json
import os

# Path to the CSV file
script_dir = os.path.dirname(__file__) # absolute dir the script is in
csv_file_path = script_dir + '/../../static/models/model_input_sample.csv'

# Path to save the JSON file
json_file_path = script_dir + '/../../static/data/cols_flat_type.json'

# Read the CSV file and extract street names
with open(csv_file_path, mode='r') as csv_file:
    reader = csv.reader(csv_file)
    header = next(reader)  # Get the header row
    flat_types = [col for col in header if col.startswith('flat_type_')]

# Create a mapping of index to street name
flat_type_mapping = {name: idx for idx, name in enumerate(flat_types)}

# Save the mapping to a JSON file
os.makedirs(os.path.dirname(json_file_path), exist_ok=True)
with open(json_file_path, mode='w') as json_file:
    json.dump(flat_type_mapping, json_file, indent=4)