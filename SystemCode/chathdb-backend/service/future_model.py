import datetime
import os
import pandas as pd
from flask import current_app
from dateutil.relativedelta import relativedelta
from .model import ReadColumnsFlatType, ReadColumnsStreetName, OpenPickle

# define constants here
script_dir = os.path.dirname(__file__) # absolute dir the script is in

def ReadFutureModel():
    return OpenPickle("static/models/final_model_future.pkl", "rb")

def ReadFutureScaler():
    return OpenPickle("static/models/scaler_future.pkl", "rb")

cols_flat_type = ReadColumnsFlatType()
cols_street_name = ReadColumnsStreetName()

def PredictFuturePrice(street_name: str, floor_area: int, storey_range: int, lease_start: int, flat_type: str):
    # get current year and month
    year = datetime.date.today().year
    date_after_1month = datetime.date.today()+ relativedelta(months=1)
    date_after_2month = datetime.date.today()+ relativedelta(months=2)
    date_after_3month = datetime.date.today()+ relativedelta(months=3)

    # default flat age = 0
    flat_age = 0
    # calculate remaining_lease and flat_age if lease_start is defined by user
    if lease_start > 0: 
        flat_age = year - lease_start
    
    # default values for town and flat model
    townList = [0] * 588
    flatTypeList = [0] * 7
    
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
    cols_training = pd.read_csv("static/models/X_single_test_data_future.csv")
    # Create an empty DataFrame with the correct columns
    test_df = pd.DataFrame(columns=cols_training.columns)
    # Fill in the values for your input data
    test_df.loc[0] = [floor_area,lease_start,storey_range,flat_age] + townList + flatTypeList + [year, date_after_1month.month]
    test_df.loc[1] = [floor_area,lease_start,storey_range,flat_age] + townList + flatTypeList + [year, date_after_2month.month]
    test_df.loc[2] = [floor_area,lease_start,storey_range,flat_age] + townList + flatTypeList + [year, date_after_3month.month]
    scaler = ReadFutureScaler()
    # Scale numerical features
    numerical_features = ['floor_area_sqm', 'storey_median', 'flat_age']
    test_df[numerical_features] = scaler.transform(test_df[numerical_features])
    # Make prediction
    xgb_model = ReadFutureModel()
    return {
        date_after_1month.strftime("%m-%Y"): float(xgb_model.predict(test_df)[0]),
        date_after_2month.strftime("%m-%Y"): float(xgb_model.predict(test_df)[1]),
        date_after_3month.strftime("%m-%Y"): float(xgb_model.predict(test_df)[2])
    }


def TestPredictFuturePrice() -> int:
    try:
        return PredictFuturePrice(street_name="ADMIRALTY LINK", floor_area=105, storey_range=2, lease_start=2019, flat_type="4 ROOM") # Return predicted as a float
    except Exception as e:
        # Catch any exception and return an appropriate error response
        current_app.logger.error(f"Error in TestPredictPrice: {str(e)}")
        return str(e)

def map_street_name(street_name: str) -> str:
    return "street_name_" + street_name

def map_flat_type(flat_type: str) -> str:
    return "flat_type_" + flat_type

