import os
import requests
from dotenv import load_dotenv

load_dotenv('backend/.env')
api_key = os.getenv('GROQ_API_KEY')

response = requests.get(
    "https://api.groq.com/openai/v1/models",
    headers={"Authorization": f"Bearer {api_key}"}
)

if response.status_code == 200:
    models = response.json().get('data', [])
    print("Available Groq Models:")
    for m in models:
        print(f"- {m['id']}")
else:
    print(f"Error fetching models: {response.status_code}")
    print(response.text)
