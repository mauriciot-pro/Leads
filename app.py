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
    for i, row in enumerate(raw_data):
        # We want to send all rows to the 'All Leads' view. 
        # For the dashboard, the frontend will filter, but the API sends everything.
        try:
            # Check if it has our new schema (Lead ID is now at index 6)
            has_id = len(row) > 6 and str(row[6]).isdigit() and len(str(row[6])) > 10
            
            leads.append({
                "id": row[6] if has_id else f"legacy_{i}",
                "full_name": row[0] if len(row) > 0 else "",
                "first_name": row[0] if len(row) > 0 else "", 
                "last_name": row[1] if len(row) > 1 else "", 
                "report_date": row[3] if len(row) > 3 else "",
                "reported_by": row[2] if len(row) > 2 else "",
                # Legacy rows might not have a status, default to 'Imported Lead'
                "status_update": row[4] if len(row) > 4 and row[4] else "Imported Lead",
                "comments": row[5] if len(row) > 5 else "",
                "created_at": row[7] if len(row) > 7 else "",
                "is_legacy": not has_id
            })
        except Exception as e:
            print(f"Error parsing row {i}: {e}")
            pass
                
    # Sort backwards so newest are at the top
    leads.reverse()
    return jsonify(leads)

@app.route('/api/leads', methods=['POST'])
def create_lead():
    data = request.json
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    reported_by = data.get('reported_by')
    comments = data.get('comments', '')

    if not all([first_name, last_name, reported_by]):
        return jsonify({"success": False, "error": "Missing required fields (First Name, Last Name, or Agent)"}), 400

    result = add_lead(first_name, last_name, reported_by, comments)
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
