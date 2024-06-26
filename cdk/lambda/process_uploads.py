import json
import boto3
import os

s3_client = boto3.client('s3')
textract_client = boto3.client('textract')
rekognition_client = boto3.client('rekognition')

def handler(event, context):
    bucket = os.environ['BUCKET_NAME']
    for record in event['Records']:
        key = record['s3']['object']['key']
        response = s3_client.get_object(Bucket=bucket, Key=key)
        content_type = response['ContentType']
        
        if 'text' in content_type:
            process_text(bucket, key)
        elif 'image' in content_type:
            process_image(bucket, key)
        else:
            print(f'Unsupported content type: {content_type}')

def process_text(bucket, key):
    response = textract_client.analyze_document(
        Document={'S3Object': {'Bucket': bucket, 'Name': key}},
        FeatureTypes=['TABLES', 'FORMS']
    )
    # Process Textract response
    print(json.dumps(response, indent=2))

def process_image(bucket, key):
    response = rekognition_client.detect_labels(
        Image={'S3Object': {'Bucket': bucket, 'Name': key}},
        MaxLabels=10
    )
    # Process Rekognition response
    print(json.dumps(response, indent=2))
