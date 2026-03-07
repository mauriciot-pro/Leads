from datetime import datetime
from sheets_util import get_sheets_service, SPREADSHEET_ID, RANGE_NAME

def get_all_leads():
    service = get_sheets_service()
    if not service: return []

    try:
        sheet = service.spreadsheets()
        result = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME).execute()
        return result.get('values', [])
    except Exception as e:
        print(f"Error reading from Sheets: {e}")
        return []

def add_lead(full_name, reported_by, comments):
    # Check for duplicates first
    existing_leads = get_all_leads()
    
    conflict = None
    full_name_lower = full_name.lower().strip()
    
    for row in existing_leads:
        if len(row) > 1:
            # Match against the legacy structure where Col B (Index 1) is presumably the Full Name string
            # Looking at the original data dump: ['', 'Alejandro Dinner', 'Alejandro', 'Dinner'...]
            row_full_name = str(row[1]).lower().strip()

            # Check Name Conflict
            if row_full_name == full_name_lower:
                agent_name = row[5] if len(row) > 5 else "Another Agent"
                conflict_date = row[4] if len(row) > 4 else "an earlier date"
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
    
    # New row structure to match legacy:
    # 0: ID
    # 1: Full Name string
    # 2: First Name (we'll leave blank since we no longer collect it separately)
    # 3: Last Name (we'll leave blank)
    # 4: Report Date
    # 5: Reported By
    # 6: Status
    # 7: Comments
    # 8: ISO Timestamp
    
    new_row = [
        lead_id, full_name, "", "", report_date, 
        reported_by, status, comments, iso_timestamp
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
        if len(row) > 0 and row[0] == lead_id:
            row_index = i + 1  # Sheets are 1-indexed
            break
            
    if row_index == -1:
        return {"success": False, "error": "Lead not found."}
        
    # Update just the status column (Col G)
    update_range = f"Sheet1!G{row_index}"
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
