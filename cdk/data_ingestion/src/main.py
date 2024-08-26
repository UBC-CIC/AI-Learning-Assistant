import os
import json
import logging

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

def handler(event, context):
    logger.info("Data Ingestion Lambda function is called!")
    
    # Extracting the key from the S3 event
    s3_event = event['Records'][0]['s3']
    bucket_name = s3_event['bucket']['name']
    object_key = s3_event['object']['key']

    # Parse the key to extract components
    try:
        course_name, concept_name, module_name, _, file_name_with_extension = object_key.split('/')
        file_name, file_type = file_name_with_extension.rsplit('.', 1)
    except ValueError:
        logger.error("Unexpected key format: %s", object_key)
        return {
            'statusCode': 500,
            'body': json.dumps('Unexpected key format')
        }

    # Log the extracted components
    logger.info("Course Name: %s", course_name)
    logger.info("Concept Name: %s", concept_name)
    logger.info("Module Name: %s", module_name)
    logger.info("File Name: %s", file_name)
    logger.info("File Type: %s", file_type)

    return {
        'statusCode': 200,
        'body': json.dumps({
            'course_name': course_name,
            'concept_name': concept_name,
            'module_name': module_name,
            'file_name': file_name,
            'file_type': file_type
        })
    }