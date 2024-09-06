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
    module_name = query_params.get("module_name", "")
    module_id = query_params.get("module_id", "")

    if not course_id or not module_name or not module_id:
        logger.error("Missing required parameters", extra={
            "course_id": course_id,
            "module_name": module_name,
            "module_id": module_id
        })
        return {
            'statusCode': 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps("Missing required parameters: course_id, module_name, or module_id")
        }

    try:
        module_prefix = f"{course_id}/{module_name}_{module_id}/"

        response = s3.list_objects_v2(Bucket=BUCKET, Prefix=module_prefix)

        if 'Contents' in response:
            # Delete all objects in the module directory
            objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
            delete_response = s3.delete_objects(
                Bucket=BUCKET,
                Delete={'Objects': objects_to_delete}
            )

            logger.info(f"Deleted objects: {delete_response}")
            return {
                'statusCode': 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                'body': json.dumps(f"Deleted module directory: {module_prefix}")
            }
        else:
            logger.info(f"No objects found in module directory: {module_prefix}")
            return {
                'statusCode': 404,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                'body': json.dumps(f"No objects found in module directory: {module_prefix}")
            }

    except Exception as e:
        logger.exception(f"Error deleting module directory: {e}")
        return {
            'statusCode': 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps(f"Internal server error: {str(e)}")
        }