import json

def lambda_handler(event, context):
    records = event.get('Records', [])
    if not records:
        return {
            "statusCode": 400,
            "body": json.dumps("No valid S3 event found.")
        }

    for record in records:
        if record['eventName'].startswith('ObjectCreated:'):
            bucket_name = record['s3']['bucket']['name']
            file_key = record['s3']['object']['key']
            file_path = f"s3://{bucket_name}/{file_key}"
            
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": "New file uploaded.",
                    "file_path": file_path
                })
            }
    
    return {
        "statusCode": 400,
        "body": json.dumps("No new file upload event found.")
    }