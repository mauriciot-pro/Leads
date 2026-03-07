import os
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

# The ID of the spreadsheet.
SPREADSHEET_ID = '14kNTqTJNr3_SCtnGCL-9vyxW70jbfmbQguPugyhKljQ'

# The range of data to read. Adjust this if your sheet's name is not 'Sheet1'.
RANGE_NAME = 'Sheet1!A:Z' 

# Path to the JSON key file you downloaded.
SERVICE_ACCOUNT_FILE = 'clientdb-app-d8ba72698da2.json'

def main():
    creds = None
    try:
        # Load the Service Account Credentials
        creds = Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)
            
        # Build the service object.
        service = build('sheets', 'v4', credentials=creds)

        # Call the Sheets API
        sheet = service.spreadsheets()
        result = sheet.values().get(spreadsheetId=SPREADSHEET_ID,
                                    range=RANGE_NAME).execute()
        values = result.get('values', [])

        if not values:
            print('No data found.')
        else:
            print('--- Data from ClientDB ---')
            for row in values:
                # Print columns A and E, which correspond to indices 0 and 4.
                print(row)

    except Exception as err:
        print(f"An error occurred: {err}")

if __name__ == '__main__':
    main()
