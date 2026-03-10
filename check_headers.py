from sheets_util import get_sheets_service, SPREADSHEET_ID, RANGE_NAME
service = get_sheets_service()
result = service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME).execute()
values = result.get('values', [])
print("Headers:")
print(values[0])
print("\nFirst row:")
if len(values) > 1:
    print(values[1])
print("\nSecond row:")
if len(values) > 2:
    print(values[2])
