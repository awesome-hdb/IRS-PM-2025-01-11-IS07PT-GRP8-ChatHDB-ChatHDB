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


## Database Management
### Initialize DB Migrations
````bash
# Install Supabase CLI
## Mac
brew install supabase/tap/supabase

# Init Supabase in your project
supabase init

 # Creates a new migration file
supabase migration new add_users_table

# Open the newly created file in /supabase/migrations and define your schema in SQL.

# Push the new schema to Supabase
supabase db push
````
