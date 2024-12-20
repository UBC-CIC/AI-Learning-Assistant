import os
import json
import logging
import boto3
import psycopg2
import csv
from datetime import datetime
from botocore.exceptions import ClientError

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

# Environment variables
DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]
REGION = os.environ["REGION"]
CHATLOGS_BUCKET = os.environ["CHATLOGS_BUCKET"]
RDS_PROXY_ENDPOINT = os.environ["RDS_PROXY_ENDPOINT"]
APPSYNC_API_URL = os.environ["APPSYNC_API_URL"]
APPSYNC_API_KEY = os.environ["APPSYNC_API_KEY"]

# AWS Clients
secrets_manager_client = boto3.client("secretsmanager")
s3_client = boto3.client("s3")

# Cached resources
connection = None
db_secret = None

def get_secret():
    global db_secret
    if db_secret is None:
        try:
            response = secrets_manager_client.get_secret_value(SecretId=DB_SECRET_NAME)["SecretString"]
            db_secret = json.loads(response)
        except Exception as e:
            logger.error(f"Error fetching secret {DB_SECRET_NAME}: {e}")
            raise
    return db_secret

def connect_to_db():
    global connection
    if connection is None or connection.closed:
        try:
            secret = get_secret()
            connection_params = {
                'dbname': secret["dbname"],
                'user': secret["username"],
                'password': secret["password"],
                'host': RDS_PROXY_ENDPOINT,
                'port': secret["port"]
            }
            connection_string = " ".join([f"{key}={value}" for key, value in connection_params.items()])
            connection = psycopg2.connect(connection_string)
            logger.info("Connected to the database!")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            if connection:
                connection.rollback()
                connection.close()
            raise
    return connection

def query_chat_logs(course_id):
    """
    Queries the database to fetch chat logs for a given course_id.
    """
    connection = connect_to_db()
    if connection is None:
        logger.error("No database connection available.")
        return {
            "statusCode": 500,
            "body": json.dumps("Database connection failed.")
        }
    
    try:
        cur = connection.cursor()

        query = """
            SELECT 
                u.user_id, 
                cm.module_name, 
                cc.concept_name, 
                s.session_id, 
                m.message_content AS message, 
                m.student_sent AS sent_by_student, 
                CASE 
                    WHEN sm.module_score = 100 THEN 'complete' 
                    ELSE 'incomplete' 
                END AS competency_status,
                m.time_sent AS timestamp
            FROM 
                "Messages" m
            JOIN 
                "Sessions" s ON m.session_id = s.session_id
            JOIN 
                "Student_Modules" sm ON s.student_module_id = sm.student_module_id
            JOIN 
                "Course_Modules" cm ON sm.course_module_id = cm.module_id
            JOIN 
                "Course_Concepts" cc ON cm.concept_id = cc.concept_id
            JOIN 
                "Enrolments" e ON sm.enrolment_id = e.enrolment_id
            JOIN 
                "Users" u ON e.user_id = u.user_id
            WHERE 
                cc.course_id = %s
            ORDER BY 
                u.user_id, cm.module_name, s.session_id, m.time_sent;
        """
        cur.execute(query, (course_id,))
        results = cur.fetchall()
        logger.info(f"Fetched {len(results)} records for course_id: {course_id}")
        cur.close()
        return results
    except Exception as e:
        if cur:
            cur.close()
        connection.rollback()
        logger.error(f"Error querying chat logs: {e}")
        return none

def write_to_csv(data, course_id, instructor_email):
    """
    Writes the queried data to a CSV file.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    file_name = f"{course_id}-{instructor_email}-{timestamp}.csv"
    try:
        with open(f"/tmp/{file_name}", mode="w", newline="") as file:
            writer = csv.writer(file)
            # Write header
            writer.writerow([
                "user_id", "module_name", "concept_name", "session_id", 
                "message", "sent_by_student", "competency_status", "timestamp"
            ])
            # Write rows
            writer.writerows(data)
        logger.info(f"Data written to CSV file: {file_name}")
        return f"/{course_id}/{file_name}", file_name
    except Exception as e:
        logger.error(f"Error writing to CSV: {e}")
        raise


def upload_to_s3(file_path, file_name):
    """
    Uploads the file to the specified S3 bucket.
    """
    try:
        s3_client.upload_file(file_path, CHATLOGS_BUCKET, file_name)
        logger.info(f"File uploaded to S3: s3://{CHATLOGS_BUCKET}/{file_name}")
        return f"s3://{CHATLOGS_BUCKET}/{file_name}"
    except Exception as e:
        logger.error(f"Error uploading file to S3: {e}")
        raise

def invoke_event_notification(course_id, instructor_email, message="Chat logs successfully uploaded"):
    """
    Publish a notification event to AppSync via HTTPX (directly to the AppSync API).
    """
    try:
        query = """
        mutation sendNotification($message: String!, $course_id: String!, $instructor_email: String!) {
            sendNotification(message: $message, course_id: $course_id, instructor_email: $instructor_email) {
                message
                course_id
                instructor_email
            }
        }
        """
        headers = {
            "Content-Type": "application/json",
            "Authorization": "API_KEY"
        }

        payload = {
            "query": query,
            "variables": {
                "message": message,
                "course_id": course_id,
                "instructor_email": instructor_email
            }
        }

        # Send the request to AppSync
        with httpx.Client() as client:
            response = client.post(APPSYNC_API_URL, headers=headers, json=payload)
            response_data = response.json()

            logging.info(f"AppSync Response: {json.dumps(response_data, indent=2)}")
            if response.status_code != 200 or "errors" in response_data:
                raise Exception(f"Failed to send notification: {response_data}")

            print(f"Notification sent successfully: {response_data}")
            return response_data["data"]["sendNotification"]

    except Exception as e:
        logging.error(f"Error publishing event to AppSync: {str(e)}")
        raise

def handler(event, context):
    """
    Lambda entry point.
    """
    try:
        # Parse SQS event
        for record in event.get("Records", []):
            message_body = json.loads(record["body"])
            course_id = message_body.get("course_id")
            instructor_email = message_body.get("instructor_email")
            if not course_id:
                logger.error("course_id is required in the message body")
                continue

            # Query chat logs
            chat_logs = query_chat_logs(course_id)

            # Write to CSV
            csv_path, csv_name = write_to_csv(chat_logs, course_id, instructor_email)

            # Upload to S3
            s3_uri = upload_to_s3(csv_path, csv_name)

            logger.info(f"Chat logs successfully processed and uploaded to {s3_uri}")

            # Send notification to AppSync
            invoke_event_notification(course_id, instructor_email, message=f"Chat logs uploaded to {s3_uri}")
        
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Chat logs processed successfully"})
        }
    except Exception as e:
        logger.error(f"Error in lambda_handler: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Internal Server Error"})
        }