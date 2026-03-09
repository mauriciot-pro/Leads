import os
import json
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from datetime import datetime
from dateutil import parser

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

# The ID of the spreadsheet.
SPREADSHEET_ID = '1udS8Qe2HsxUYmSYvXs6LOAqFCJkeotZ9xjn304GWEf4'
# The range of data to read. Adjust this if your sheet's name is not 'Sheet1'.
RANGE_NAME = 'Sheet1!A:Z' 
# Path to the JSON key file you downloaded.
SERVICE_ACCOUNT_FILE = 'clientdb-app-d8ba72698da2.json'

def get_sheets_service():
    """Builds and returns the Google Sheets API service object."""
    try:
        if 'GOOGLE_CREDENTIALS_JSON' in os.environ:
            creds_info = json.loads(os.environ['GOOGLE_CREDENTIALS_JSON'])
            creds = Credentials.from_service_account_info(creds_info, scopes=SCOPES)
        else:
            creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
            
        service = build('sheets', 'v4', credentials=creds)
        return service
    except Exception as e:
        print(f"Error authenticating with Google Sheets: {e}")
        return None

def get_all_leads():
    """Fetches all leads from the Google Sheet."""
    service = get_sheets_service()
    if not service: return []

    try:
        sheet = service.spreadsheets()
        result = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME).execute()
        values = result.get('values', [])
        
        # We assume row 1 contains headers, start at row 2 (index 1)
        leads = []
        if len(values) > 1:
            for i in range(1, len(values)):
                row = values[i]
                # Pad row with empty strings if it's shorter than expected
                row += [''] * (8 - len(row))
                
                # Sheet Columns corresponding to user spec:
                # Assuming standard order: First Name, Last Name, Phone, Report Date, Reported By, Status, Comments, Created At Timestamp
                # We need to adapt this to the actual sheet if the columns are different.
                # Since the current sheet doesn't have these exact columns, let's map what we have and append what we need.
                # Looking at earlier output:
                # Index 0: ?? (empty)
                # Index 1: Full Name string
                # Index 2: First Name
                # Index 3: Last Name
                # Index 4: Date?
                # Index 5: Reported By
                
                # FOR THIS NEW APP: We will append NEW data to the end of the sheet using the explicit schema you requested.
                # However, to check *existing* data for conflicts, we need to know which column holds the Phone Number.
                # Since the existing data doesn't seem to have a strict phone number column printed out earlier, let's assume 
                # new entries will be strictly formatted. Let's create an App-Specific Sheet or just use the existing one but append precisely.
                pass # Logic will be in the main app file for better organization
        return values
    except Exception as e:
        print(f"Error fetching data: {e}")
        return []
