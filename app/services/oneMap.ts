const ONEMAP_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0ZDBiNTVlMWI2NzQ3YWU0ODY3YmFhMGY2M2E0NzlmZSIsImlzcyI6Imh0dHA6Ly9pbnRlcm5hbC1hbGItb20tcHJkZXppdC1pdC1uZXctMTYzMzc5OTU0Mi5hcC1zb3V0aGVhc3QtMS5lbGIuYW1hem9uYXdzLmNvbS9hcGkvdjIvdXNlci9wYXNzd29yZCIsImlhdCI6MTczODM5NDM0MiwiZXhwIjoxNzM4NjUzNTQyLCJuYmYiOjE3MzgzOTQzNDIsImp0aSI6IjlPdXNkTGhNelVjMXZpdzYiLCJ1c2VyX2lkIjo1Nzk5LCJmb3JldmVyIjpmYWxzZX0.0jEKCRz6W0KLh6ZzcmcaoQflrqMyUkB4l2x73qgtQ-Q";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getAddressFromPostal(postalCode: string) {
  let lastError;
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await fetch(
        `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${ONEMAP_TOKEN}`
          },
          cache: 'no-store'
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return null;
      }

      const result = data.results[0];
      return {
        address: result.ADDRESS,
        streetName: result.ROAD_NAME,
        position: {
          lat: parseFloat(result.LATITUDE),
          lng: parseFloat(result.LONGITUDE)
        }
      };
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      lastError = error;
      
      if (i < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY);
      }
    }
  }

  console.error('All retries failed:', lastError);
  throw new Error('Failed to fetch address data after multiple attempts. Please try again later.');
} 