from flask import Flask, render_template, request, jsonify
from lead_manager import get_all_leads, add_lead, update_lead_status

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/leads', methods=['GET'])
def fetch_leads():
    raw_data = get_all_leads()
    leads = []
    # Parse the raw sheet data into a JSON structure the frontend expects
    for row in raw_data:
        # Only parse rows that have our new schema structure (at least an ID)
        if len(row) >= 9:
            try:
                # Ensure it looks like our generated timestamp ID
                int(row[0])
                leads.append({
                    "id": row[0],
                    "full_name": row[1],
                    "first_name": "", # Legacy support
                    "last_name": "", # Legacy support
                    "phone_number": "", # Legacy Support
                    "report_date": row[4],
                    "reported_by": row[5],
                    "status_update": row[6],
                    "comments": row[7] if len(row) > 7 else "",
                    "created_at": row[8] if len(row) > 8 else ""
                })
            except ValueError:
                # Skip header rows or old unstructured data for the dashboard parsing
                pass
                
    # Sort backwards so newest are at the top
    leads.reverse()
    return jsonify(leads)

@app.route('/api/leads', methods=['POST'])
def create_lead():
    data = request.json
    full_name = data.get('full_name')
    reported_by = data.get('reported_by')
    comments = data.get('comments', '')

    if not all([full_name, reported_by]):
        return jsonify({"success": False, "error": "Missing required fields (Name or Agent)"}), 400

    result = add_lead(full_name, reported_by, comments)
    if result.get("success"):
        return jsonify(result), 201
    elif "conflict" in result:
        # Conflict format: {"agent": "Agent Name", "date": "Date"}
        return jsonify(result), 409
    else:
        return jsonify(result), 500

@app.route('/api/leads/<lead_id>', methods=['PUT'])
def update_lead(lead_id):
    data = request.json
    new_status = data.get('status')
    if not new_status:
        return jsonify({"success": False, "error": "New status required"}), 400
        
    result = update_lead_status(lead_id, new_status)
    if result.get("success"):
        return jsonify({"success": True}), 200
    return jsonify(result), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
