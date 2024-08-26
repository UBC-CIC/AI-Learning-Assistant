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

@logger.inject_lambda_context
def lambda_handler(event, context):
    query_params = event.get("queryStringParameters", {})

    course_name = query_params.get("course_name", "")
    module_id = query_params.get("module_id", "")
    module_name = query_params.get("module_name", "")

    if not course_name or not module_id or not module_name:
        logger.error("Missing required parameters", extra={
            "course_name": course_name,
            "module_id": module_id,
            "module_name": module_name
        })
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required parameters: course_name, module_id, or module_name')
        }

    try:
        document_prefix = f"{course_name}/{module_name}_{module_id}/documents/"
        image_prefix = f"{course_name}/{module_name}_{module_id}/images/"

        document_files = list_files_in_s3_prefix(BUCKET, document_prefix)
        image_files = list_files_in_s3_prefix(BUCKET, image_prefix)

        logger.info("Files retrieved successfully", extra={
            "document_files": document_files,
            "image_files": image_files
        })

        return {
            'statusCode': 200,
            'body': json.dumps({
                'document_files': document_files,
                'image_files': image_files
            })
        }
    except Exception as e:
        logger.exception(f"Error retrieving files: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Internal server error')
        }