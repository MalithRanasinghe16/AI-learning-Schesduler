import requests
import json

# Test the chat endpoint with schedule view message
url = "http://localhost:8000/chat"

# Sample request data - this is what would trigger the error
data = {
    "message": "Show my current schedules",
    "user_id": "test_user_123",
    "conversation_id": "test_conv_456"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("Response JSON:")
        print(json.dumps(result, indent=2))
    else:
        print(f"Error Response: {response.text}")
        
except Exception as e:
    print(f"Error making request: {e}")
