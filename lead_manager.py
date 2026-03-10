from datetime import datetime
from sheets_util import get_sheets_service, SPREADSHEET_ID, RANGE_NAME

def get_all_leads():
    service = get_sheets_service()
    if not service: return []

    try:
        sheet = service.spreadsheets()
        result = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME).execute()
        values = result.get('values', [])
        return values[1:] if len(values) > 1 else []
    except Exception as e:
        print(f"Error reading from Sheets: {e}")
        return []

def add_lead(first_name, last_name, reported_by, comments):
    # Check for duplicates first
    existing_leads = get_all_leads()
    
    conflict = None
    full_name = f"{first_name} {last_name}".strip()
    full_name_lower = full_name.lower()
    
    for row in existing_leads:
        if len(row) > 0:
            # First Name uses Col A (0), Last Name Col B (1)
            nombre = str(row[0]).strip() if len(row) > 0 else ""
            apellido = str(row[1]).strip() if len(row) > 1 else ""
            row_full_name = f"{nombre} {apellido}".strip().lower()

            # Check Name Conflict
            if row_full_name and row_full_name == full_name_lower:
                agent_name = row[2] if len(row) > 2 else "Another Agent"
                conflict_date = row[3] if len(row) > 3 else "an earlier date"
                conflict = {"agent": agent_name, "date": conflict_date, "type": "Name"}
                break
    
    if conflict:
        return {"success": False, "conflict": conflict}
        
    # No conflict, add the new lead
    now = datetime.now()
    report_date = now.strftime("%B %d, %Y")
    iso_timestamp = now.isoformat()
    # Simple ID generation
    lead_id = str(int(now.timestamp() * 1000))
    status = "New Registration"
    
    # Schema: 0:First, 1:Last, 2:Agent, 3:Date, 4:Status, 5:Comment, 6:ID, 7:Time
    new_row = [
        first_name, last_name, reported_by, report_date, 
        status, comments, lead_id, iso_timestamp
    ]
    
    service = get_sheets_service()
    if not service:
        return {"success": False, "error": "Could not connect to Google Sheets."}
        
    try:
        sheet = service.spreadsheets()
        body = {'values': [new_row]}
        result = sheet.values().append(
            spreadsheetId=SPREADSHEET_ID, 
            range=RANGE_NAME,
            valueInputOption="USER_ENTERED", 
            body=body
        ).execute()
        
        return {
            "success": True, 
            "lead": {
                "id": lead_id, "full_name": full_name, 
                "report_date": report_date,
                "reported_by": reported_by, "status_update": status,
                "comments": comments, "created_at": iso_timestamp
            }
        }
    except Exception as e:
        print(f"Error writing to Sheets: {e}")
        return {"success": False, "error": str(e)}

def update_lead_status(lead_id, new_status):
    # Google Sheets update logic is more complex as we have to find the specific row.
    existing_leads = get_all_leads()
    row_index = -1
    
    for i, row in enumerate(existing_leads):
        if len(row) > 6 and str(row[6]).strip() == str(lead_id).strip():
            row_index = i + 2  # Fixed index to match Google Sheets (1-indexed + 1 for header)
            break
            
    if row_index == -1:
        return {"success": False, "error": "Lead not found."}
        
    # Update just the status column (Col E)
    update_range = f"Sheet1!E{row_index}"
    service = get_sheets_service()
    
    try:
        sheet = service.spreadsheets()
        body = {'values': [[new_status]]}
        result = sheet.values().update(
            spreadsheetId=SPREADSHEET_ID, 
            range=update_range,
            valueInputOption="USER_ENTERED", 
            body=body
        ).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
