import os
import json
import boto3
from aws_lambda_powertools import Logger

logger = Logger()

s3 = boto3.client('s3')
BUCKET = os.environ["BUCKET"]

@logger.inject_lambda_context
def lambda_handler(event, context):
    query_params = event.get("queryStringParameters", {})

    course_id = query_params.get("course_id", "")
    module_id = query_params.get("module_id", "")
    module_name = query_params.get("module_name", "")
    file_name = query_params.get("file_name", "")
    file_type = query_params.get("file_type", "")

    if not course_id or not module_id or not module_name or not file_name or not file_type:
        logger.error("Missing required parameters", extra={
            "course_id": course_id,
            "module_id": module_id,
            "module_name": module_name,
            "file_name": file_name,
            "file_type": file_type
        })
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required parameters: course_id, module_id, module_name, file_name, or file_type')
        }

    try:
        # Allowed file types for ducuments
        allowed_document_types = {"pdf", "docx", "pptx", "txt", "xlsx", "xps", "mobi", "cbz"}
        
        # Allowed file types for images
        allowed_images_types = {
            'bmp', 'eps', 'gif', 'icns', 'ico', 'im', 'jpeg', 'jpg', 'j2k', 'jp2', 'msp',
            'pcx', 'png', 'ppm', 'pgm', 'pbm', 'sgi', 'tga', 'tiff', 'tif', 'webp', 'xbm', 'txt'
        }

        folder = None
        if file_type in allowed_document_types:
            folder = "documents"
        elif file_type in allowed_images_types:
            folder = "images"
        else:
            return {
                'statusCode': 400,
                'body': json.dumps('Unsupported file type')
            }

        file_key = f"{course_id}/{module_name}_{module_id}/{folder}/{file_name}.{file_type}"
        
        response = s3.delete_objects(
            Bucket=BUCKET,
            Delete={
                "Objects": [{"Key": file_key}],
                "Quiet": True,
            },
        )
        
        logger.info(f"Response: {response}")
        logger.info(f"File {file_key} deleted successfully.")
        return {
            'statusCode': 200,
            'body': json.dumps('File deleted successfully')
        }
        
    except Exception as e:
        logger.exception(f"Error deleting file: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Internal server error')
        }