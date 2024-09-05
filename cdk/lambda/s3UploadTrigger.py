import os
import json
import boto3
import logging
import psycopg2
from datetime import datetime, timezone

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]

def get_secret(secret_name):
    # secretsmanager client to get db credentials
    sm_client = boto3.client("secretsmanager")
    response = sm_client.get_secret_value(SecretId=secret_name)["SecretString"]
    secret = json.loads(response)
    return secret

def connect_to_db():
    try:
        db_secret = get_secret(DB_SECRET_NAME)
        connection_params = {
            'dbname': db_secret["dbname"],
            'user': db_secret["username"],
            'password': db_secret["password"],
            'host': db_secret["host"],
            'port': db_secret["port"]
        }
        connection_string = " ".join([f"{key}={value}" for key, value in connection_params.items()])
        connection = psycopg2.connect(connection_string)
        logger.info("Connected to the database!")
        return connection
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return None

def parse_s3_file_path(file_key):
    # Assuming the file path is of the format: {course_id}/{module_name}_{module_id}/{documents_or_images}/{file_name}.{file_type}
    try:
        course_id, module_and_id, file_category, filename_with_ext = file_key.split('/')
        module_name, module_id = module_and_id.split('_')
        file_name, file_type = filename_with_ext.split('.')
        return course_id, module_name, module_id, file_category, file_name, file_type
    except Exception as e:
        logger.error(f"Error parsing S3 file path: {e}")
        return {
                    "statusCode": 400,
                    "body": json.dumps("Error parsing S3 file path.")
                }

def insert_file_metadata_into_db(module_id, file_name, file_type, file_path, bucket_name):
    try:
        connection = connect_to_db()
        if connection is None:
            logger.error("No database connection available.")
            return {
                "statusCode": 500,
                "body": json.dumps("Database connection failed.")
            }
        cur = connection.cursor()

        insert_query = """
            INSERT INTO "Module_Files" 
            (module_id, filetype, s3_bucket_reference, filepath, filename, time_uploaded, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """
        timestamp = datetime.now(timezone.utc)
        cur.execute(insert_query, (
            module_id,  # module_id
            file_type,  # filetype
            bucket_name,  # s3_bucket_reference
            file_path,  # filepath
            file_name,  # filename
            timestamp,  # time_uploaded
            ""  # metadata
        ))

        connection.commit()
        logger.info(f"Successfully inserted file metadata into database for module {module_id}.")

        cur.close()
        connection.close()
    except Exception as e:
        if cur:
            cur.close()
        if connection:
            connection.rollback()
            connection.close()
        logger.error(f"Error inserting file metadata into database: {e}")
        raise

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

            # Parse the file path
            course_id, module_name, module_id, file_category, file_name, file_type = parse_s3_file_path(file_key)
            if not course_id or not module_name or not module_id or not file_name or not file_type:
                return {
                    "statusCode": 400,
                    "body": json.dumps("Error parsing S3 file path.")
                }

            # Insert the metadata into the PostgreSQL database
            try:
                insert_file_metadata_into_db(
                    module_id=module_id,
                    file_name=file_name,
                    file_type=file_type,
                    file_path=file_key,
                    bucket_name=bucket_name
                )
                logger.info(f"File metadata for {file_name} inserted successfully.")
            except Exception as e:
                logger.error(f"Error inserting file metadata into database: {e}")
                return {
                    "statusCode": 500,
                    "body": json.dumps(f"Error inserting file metadata: {e}")
                }

            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": "New file inserted into database.",
                    "location": f"s3://{bucket_name}/{file_key}"
                })
            }

    return {
        "statusCode": 400,
        "body": json.dumps("No new file upload event found.")
    }