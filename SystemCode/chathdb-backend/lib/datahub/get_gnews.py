import requests
import pandas as pd
import os
import time
import urllib.parse

year = 2024
tries = 3
timeout = 5

# # Read the planning area data
start_time = time.time()
script_dir = os.path.dirname(__file__) # absolute dir the script is in
planning_area_path = script_dir + '/../../static/data/planning_area/'
planning_area_file_name = f'{planning_area_path}/planning_area_{year}.parquet'
log_file_name = f'{script_dir}/../../static/data/gnews/log/error_{start_time}.txt'
folder_path = script_dir + '/../../static/data/gnews/raw'


site_list = [
    "https://www.straitstimes.com",
    "https://mothership.sg",
    "https://www.channelnewsasia.com",
    "https://www.businesstimes.com.sg",
    "https://www.tnp.sg",
    "https://www.todayonline.com",
    "https://www.asiaone.com",
    "https://stomp.straitstimes.com",
    "https://sbr.com.sg",
    "https://www.timeout.com",
    "https://www.edgeprop.sg",
    "https://stackedhomes.com",
    "https://www.hdb.gov.sg",
    "https://www.99.co",
    "https://www.propertyguru.com.sg"
]

def convert_to_search_param(site_list: list[str]) -> str:
    site_str = ' OR '.join([f'site:{site}' for site in site_list])

    # encode the query string
    encoded_query = urllib.parse.quote(site_str)
    
    params = {
        "hl": "en-SG",
        "gl": "SG",
        "ceid": "SG:en"
    }
    
    # Build the search parameter string
    search_param = f"{encoded_query}?{urllib.parse.urlencode(params)}"
    return search_param

def fetch_rss_feed(url: str):
    response = requests.get(url)
    if response.status_code == 200:
        rss_content = response.content
        return rss_content
    else:
        print(f"Failed to fetch RSS feed: {response.status_code}")
        return None

def main():
    planning_area = pd.read_parquet(planning_area_file_name, columns=['pln_area_n'])['pln_area_n'].to_list()
    site_str = convert_to_search_param(site_list)
    
    for area in planning_area:
        print(f"Processing area: {area}")
        file_name = f'{folder_path}/{area}.xml'
        for i in range(tries):  # retry search process if data file not saved
            search_area = area.replace(" ", "+").lower()
            url = f'https://www.news.google.com/rss/search?q={search_area}%20{site_str}'
            
            rss = fetch_rss_feed(url)
            
            if rss:
                with open(file_name, "wb") as file:
                    file.write(rss)
                
                if os.path.exists(file_name):
                    break

            time.sleep(timeout * (i + 1))

        if not os.path.exists(file_name):
            with open(log_file_name, 'a') as f:
                f.write(area + '\n')

        time.sleep(timeout)


main()
print(f'Execution time: {time.time() - start_time} seconds')
print('Done')