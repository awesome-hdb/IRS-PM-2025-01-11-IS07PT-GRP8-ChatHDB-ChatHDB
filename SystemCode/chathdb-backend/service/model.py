import pickle
import datetime
import json
import os
import pandas as pd
from flask import current_app
from xgboost import XGBRegressor
from sklearn.preprocessing import StandardScaler

# define constants here
script_dir = os.path.dirname(__file__) # absolute dir the script is in

def ReadModel():
    return OpenPickle("static/models/final_model.pkl", "rb")

def ReadScaler():
    return OpenPickle("static/models/final_scaler.pkl", "rb")

def ReadColumnsFlatType():
    # Load as json
    with open('static/models/data/cols_flat_type.json', "r") as openfile:
        columns_flat_type = json.load(openfile)
    return columns_flat_type

def ReadColumnsStreetName():
    # Load as json
    with open('static/models/data/cols_street_name.json', "r") as openfile:
        street_name_json = json.load(openfile)
    return street_name_json

cols_flat_type = ReadColumnsFlatType()
cols_street_name = ReadColumnsStreetName()

def OpenPickle(filepath: str, perm: str):
    # Load the ML model
    with (open(filepath, perm)) as openfile:
        return pickle.load(openfile)

def PredictPrice(street_name: str, floor_area: int, storey_range: int, lease_start: int, flat_type: str) -> int:
    # get current year and month
    year = datetime.date.today().year
    month = datetime.date.today().month

    # default flat age = 0
    flat_age = 0
    # calculate remaining_lease and flat_age if lease_start is defined by user
    if lease_start > 0: 
        flat_age = year - lease_start
    
    # default values for town and flat model
    townList = [0] * 570
    flatTypeList = [0] * 6
    
    if street_name != "": 
        parsed_street_name = map_street_name(street_name)
        # check if street name exists in the json file
        if parsed_street_name in cols_street_name:
            # get the index of the street name in the json file
            index = cols_street_name.get(parsed_street_name)
            # set the corresponding town to 1
            townList[index] = 1
        else:
            current_app.logger.warning(f"Street name {parsed_street_name} not found in the json file")
    
    if flat_type != "":
        parsed_flat_type = map_flat_type(flat_type)
        if parsed_flat_type in cols_flat_type:
            # get the index of the flat type in the json file
            index = cols_flat_type.get(parsed_flat_type)
            # set the corresponding flat type to 1
            flatTypeList[index] = 1
        else:
            current_app.logger.warning(f"Flat type {parsed_flat_type} not found in the json file")

    # Load the training data columns to get the correct order and names
    cols_training = pd.read_csv("static/models/data/model_input_sample.csv")
    # Create an empty DataFrame with the correct columns
    test_df = pd.DataFrame(columns=cols_training.columns)
    # Fill in the values for your input data
    test_df.loc[0] = [month,floor_area,lease_start,year,storey_range,flat_age] + townList + flatTypeList
    scaler = ReadScaler()
    # Scale numerical features
    numerical_features = ['floor_area_sqm', 'storey_median', 'flat_age']
    test_df[numerical_features] = scaler.transform(test_df[numerical_features])
    # Make prediction
    xgb_model = ReadModel()
    return float(xgb_model.predict(test_df)[0]) # Return predicted as a float

def TestPredictPrice() -> int:
    try:
        return PredictPrice(street_name="ADMIRALTY LINK", floor_area=105, storey_range=2, lease_start=2019, flat_type="4 ROOM") # Return predicted as a float
    except Exception as e:
        # Catch any exception and return an appropriate error response
        current_app.logger.error(f"Error in TestPredictPrice: {str(e)}")
        return str(e)

def map_street_name(street_name: str) -> str:
    return "street_name_" + street_name

def map_flat_type(flat_type: str) -> str:
    return "flat_type_" + flat_type

