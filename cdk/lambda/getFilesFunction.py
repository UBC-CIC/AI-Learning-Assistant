import os
import json
import boto3
from aws_lambda_powertools import Logger

logger = Logger()

s3 = boto3.client('s3')
BUCKET = os.environ["BUCKET"]

def list_files_in_s3_prefix(bucket, prefix):
    result = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
    files = []
    if 'Contents' in result:
        for obj in result['Contents']:
            files.append(obj['Key'].replace(prefix, ''))
    return files

def generate_presigned_url(bucket, key):
    try:
        return s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=300
        )
    except Exception as e:
        logger.exception(f"Error generating presigned URL for {key}: {e}")
        return None

@logger.inject_lambda_context
def lambda_handler(event, context):
    query_params = event.get("queryStringParameters", {})

    course_id = query_params.get("course_id", "")
    module_id = query_params.get("module_id", "")
    module_name = query_params.get("module_name", "")

    if not course_id or not module_id or not module_name:
        logger.error("Missing required parameters", extra={
            "course_id": course_id,
            "module_id": module_id,
            "module_name": module_name
        })
        return {
            'statusCode': 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Missing required parameters: course_id, module_id, or module_name')
        }

    try:
        document_prefix = f"{course_id}/{module_name}_{module_id}/documents/"
        image_prefix = f"{course_id}/{module_name}_{module_id}/images/"

        document_files = list_files_in_s3_prefix(BUCKET, document_prefix)
        image_files = list_files_in_s3_prefix(BUCKET, image_prefix)

        # Filter out .txt files from the images folder
        image_files = [file_name for file_name in image_files if not file_name.endswith('.txt')]

        # Generate presigned URLs for each file
        document_files_urls = {file_name: generate_presigned_url(BUCKET, f"{document_prefix}{file_name}") for file_name in document_files}
        image_files_urls = {file_name: generate_presigned_url(BUCKET, f"{image_prefix}{file_name}") for file_name in image_files}

        logger.info("Presigned URLs generated successfully", extra={
            "document_files": document_files_urls,
            "image_files": image_files_urls
        })

        return {
            'statusCode': 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps({
                'document_files': document_files_urls,
                'image_files': image_files_urls
            })
        }
    except Exception as e:
        logger.exception(f"Error generating presigned URLs: {e}")
        return {
            'statusCode': 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Internal server error')
        }