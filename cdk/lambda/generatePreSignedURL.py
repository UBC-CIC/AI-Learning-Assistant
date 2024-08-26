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

    course_id = query_params.get("course_id", "")
    module_id = query_params.get("module_id", "")
    module_name = query_params.get("module_name", "")
    file_type = query_params.get("file_type", "")  # PDF or JPG
    file_name = query_params.get("file_name", "")
    txt_file_contents = query_params.get("txt_file_contents", "")

    if not course_id:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required parameter: course_id')
        }

    if not module_id:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required parameter: module_id')
        }

    if not module_name:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required parameter: module_name')
        }
    
    if not file_name:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required parameter: file_name')
        }

    txt_key = None

    # Allowed file types for ducuments
    allowed_document_types = {"pdf", "docx", "pptx", "txt", "xlsx", "xps", "mobi", "cbz"}
    
    # Allowed file types for images
    allowed_images_types = {
        'bmp': 'bmp', 'eps': 'eps', 'gif': 'gif', 'icns': 'icns', 'ico': 'ico', 'im': 'im', 'jpeg': 'jpeg', 'jpg': 'jpeg', 'j2k': 'j2k', 'jp2': 'jp2', 'msp': 'msp', 
        'pcx': 'pcx', 'png': 'png', 'ppm': 'ppm', 'pgm': 'pgm', 'pbm': 'pbm', 'sgi': 'sgi', 'tga': 'tga', 'tiff': 'tiff', 'tif': 'tif', 'webp': 'webp', 'xbm': 'xbm'
    }
    
    if file_type in allowed_document_types:
        key = f"{course_id}/{module_name}_{module_id}/documents/{file_name}.{file_type}"
        content_type = f"application/{file_type}"
    elif file_type in allowed_images_types:
        key = f"{course_id}/{module_name}_{module_id}/images/{file_name}.{file_type}"
        content_type = f"image/{allowed_images_types[file_type]}"
        txt_key = f"{course_id}/{module_name}_{module_id}/images/{file_name}.txt" if txt_file_contents else None
    else:
        return {
            'statusCode': 400,
            'body': json.dumps('Unsupported file type')
        }

    logger.info({
        "course_id": course_id,
        "module_id": module_id,
        "module_name": module_name,
        "file_type": file_type,
        "file_name": file_name,
        "txt_file_contents": txt_file_contents,
    })

    try:
        if txt_key:
            s3.put_object(
                Bucket=BUCKET,
                Key=txt_key,
                Body=txt_file_contents,
                ContentType="text/plain"
            )

        presigned_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": BUCKET,
                "Key": key,
                "ContentType": content_type,
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
            "body": json.dumps({"presignedurl": presigned_url}),
        }
    
    except Exception as e:
        logger.error(f"Error generating presigned URL or uploading txt file: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Internal server error')
        }