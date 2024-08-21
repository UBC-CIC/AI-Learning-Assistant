import os, json
import boto3
from botocore.config import Config
from aws_lambda_powertools import Logger

BUCKET = os.environ["BUCKET"]
REGION = os.environ["REGION"]

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://s3.{REGION}.amazonaws.com",
    config=Config(
        s3={"addressing_style": "virtual"}, region_name=REGION, signature_version="s3v4"
    ),
)
logger = Logger()

def s3_key_exists(bucket, key):
    try:
        s3.head_object(Bucket=bucket, Key=key)
        return True
    except:
        return False

@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context):
    # Use .get() to safely extract query string parameters
    query_params = event.get("queryStringParameters", {})

    if not query_params:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing queries to generate pre-signed URL')
        }

    course_name = query_params.get("course_name", "")
    file_type = query_params.get("file_type", "")  # PDF or JPG
    file_name = query_params.get("file_name", "")
    txt_file_name = query_params.get("txt_file_name", "")

    if not course_name:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required parameter: course_name')
        }
    
    if not file_name:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required parameter: file_name')
        }

    txt_key = None
    
    if file_type == 'pdf':
        key = f"{course_name}/documents/{file_name}.pdf"
        content_type = "application/pdf"
    elif file_type == 'jpg':
        key = f"{course_name}/images/{file_name}.jpg"
        content_type = "image/jpeg"
        txt_key = f"{course_name}/images/{file_name}.txt" if txt_file_name else None
    else:
        return {
            'statusCode': 400,
            'body': json.dumps('Unsupported file type')
        }

    logger.info({
        "course_name": course_name,
        "file_type": file_type,
        "file_name": file_name,
        "txt_file_name": txt_file_name,
    })

    presigned_urls = {
        "file_presignedurl": s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": BUCKET,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=300,
            HttpMethod="PUT",
        )
    }

    if txt_key:
        presigned_urls["txt_presignedurl"] = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": BUCKET,
                "Key": txt_key,
                "ContentType": "text/plain",
            },
            ExpiresIn=300,
            HttpMethod="PUT",
        )

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
        },
        "body": json.dumps({"presignedurl": presigned_urls}),
    }