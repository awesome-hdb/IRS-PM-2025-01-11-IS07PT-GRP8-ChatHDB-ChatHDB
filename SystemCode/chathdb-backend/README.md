## Run backend locally
Runs on http://127.0.0.1:5000

````bash
# Create new Python virtual environment (if you don't already have one locally)
python3 -m venv /path/to/new/virtual/environment

# Install dependencies
pip3 install -r requirements.txt   

# Create Python virtual environment
source venv/bin/activate  

# Run Flask application locally
python3 -m flask run  
````

### New dependencies
````bash
# Update the requirements.txt file
pip3 freeze > requirements.txt
````

## Important Files
| Content | Folder | Description |
| ------- | ------ | ----------- |
| **Static models** | /static/models | Static model pickle files |
| **Model training scripts** | /lib/xgboost | Model building scripts |
| **Multiplier calculation scripts** | /lib/multiplier | Multiplier calculation script |
| **Data scraping scripts** | /lib/datahub | Web scraping and data cleanup logic |
| **Sentiment analysis** | /lib/sentiment | Sentiment analysis on Google News |

## API Documentation
### [GET] /api/health
- Healthcheck to see if server is running.
### [GET] /api/model/predict/test
- Get test prediction to ensure model calling is working as expected.
### [GET] /api/model/predict
- Given parameters from the frontend, return base price predicted for a given house.

| Param | Type  | Default
| -------- | ------- | -------- |
| street_name | str | "ADMIRALTY LINK"
| floor_area | int | 70
| storey_range | int | 1
| lease_start | int | 2000
| flat_type | str | "2 ROOM"

### [GET] /api/model/future/predict/test
- Get test future prediction to ensure model calling is working as expected.
### [GET] /api/model/future/predict
- Given parameters from the frontend, return future prices predicted for a given house for the next 3 months.

| Param | Type  | Default
| -------- | ------- | -------- |
| street_name | str | "ADMIRALTY LINK"
| floor_area | int | 70
| storey_range | int | 1
| lease_start | int | 2000
| flat_type | str | "2 ROOM"


## Hosting Server 

The server is running live using Google Cloud platform.