from app import app
import json

with app.test_client() as client:
    resp = client.get('/api/leads')
    data = resp.json
    for lead in data:
        if lead.get('full_name') == 'Max Luco':
            print(json.dumps(lead, indent=2))
