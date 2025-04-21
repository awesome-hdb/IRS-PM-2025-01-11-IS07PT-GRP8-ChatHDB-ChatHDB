import asyncio
import aiohttp
from selenium_driverless import webdriver
from selenium_driverless.scripts.network_interceptor import NetworkInterceptor, InterceptedRequest
from http.cookies import SimpleCookie
import pandas as pd
import os
import time

year = 2024
tries = 3
timeout = 5

# # Read the planning area data
start_time = time.time()
script_dir = os.path.dirname(__file__) # absolute dir the script is in
planning_area_path = script_dir + '/../../static/data/planning_area/'
planning_area_file_name = f'{planning_area_path}/planning_area_{year}.parquet'
log_file_name = f'{script_dir}/../../static/data/gtrends/log/error_{start_time}.txt'
folder_path = script_dir + '/../../static/data/gtrends/raw'



async def on_request(data: InterceptedRequest):
    global file_name
    if "https://trends.google.com/trends/api/widgetdata/multiline" in data.request.url:
        params = data.request.params
        url = params["url"]
        cookie = SimpleCookie()
        cookie.load(params["headers"]["Cookie"])
        cookies = {k: v.value for k, v in cookie.items()}
        async with aiohttp.ClientSession() as session:
            async with session.get(url=url, cookies=cookies) as response:
                if response.status == 200:
                    with open(file_name, 'w') as f:
                        f.write(await response.text())
        

async def main():
    global file_name
    planning_area = pd.read_parquet(planning_area_file_name, columns=['pln_area_n'])['pln_area_n'].to_list()
    options = webdriver.ChromeOptions()
    async with webdriver.Chrome(options=options) as driver:
        async with NetworkInterceptor(driver, on_request=on_request) as interceptor:
            for area in planning_area:
                file_name = f'{folder_path}/{area}.csv'
                for i in range(tries): # retry search process if data file not saved
                    search_area = area.replace(" ", "+").lower()
                    url = f'https://trends.google.com/trends/explore?date=all&geo=SG&q={search_area}&hl=en-SG'
                    await driver.get(url)
                    await driver.refresh()
                    for j in range(tries): # increase wait time if data file not saved
                        await asyncio.sleep(timeout * (j + 1))
                        if os.path.exists(file_name):
                            break
                    if os.path.exists(file_name):
                        break
                
                if not os.path.exists(file_name):
                    with open(log_file_name, 'a') as f:
                        f.write(area + '\n')


asyncio.run(main())

print(f'Execution time: {time.time() - start_time} seconds')
print('Done')