import requests
import json

url = "http://127.0.0.1:8001/api/helpdesk/ask"
payload = {
    "user_id": "test-user",
    "message": "How do I do a mock interview? And follow up: Can I do a resume one?",
    "page_context": "interview",
    "history": []
}

response = requests.post(url, json=payload)
print(response.status_code)
print(response.json())
