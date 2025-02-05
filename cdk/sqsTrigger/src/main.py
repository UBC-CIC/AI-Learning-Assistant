import os
import json
import logging
import boto3
import psycopg2
import csv
import httpx
import time
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
            print("Connected to the database!")
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
        error_message = "Database connection is unavailable."
        logger.error(error_message)
        raise Exception(error_message)

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
        logger.info(f"Fetched {len(results)} chat log records for course_id: {course_id}.")
        print(f"Fetched {len(results)} chat log records for course_id: {course_id}.")
        cur.close()
        return results
    except Exception as e:
        if cur:
            cur.close()
        connection.rollback()
        logger.error(f"Error querying chat logs for course_id {course_id}: {e}")
        raise


def write_to_csv(data, course_id, instructor_email):
    """
    Writes the queried data to a CSV file.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    file_name = f"{timestamp}.csv"
    file_dir = f"/tmp/{course_id}/{instructor_email}"
    file_path = f"{file_dir}/{file_name}"

    try:
        # Ensure the directory exists (including nested directories)
        os.makedirs(file_dir, exist_ok=True)

        # Write the data to the CSV file
        with open(file_path, mode="w", newline="") as file:
            writer = csv.writer(file)
            writer.writerow([
                "user_id", "module_name", "concept_name", "session_id", 
                "message", "sent_by_student", "competency_status", "timestamp"
            ])
            writer.writerows(data)

        logger.info(f"CSV file created successfully: {file_path}")
        print(f"CSV file created successfully: {file_path}")
        return file_path, file_name
    except Exception as e:
        logger.error(f"Error writing to CSV file {file_name}: {e}")
        raise


def upload_to_s3(file_path, course_id, instructor_email, file_name):
    """
    Uploads the file to S3 with the specified path.
    """
    # Construct the S3 key (path in the bucket)
    s3_key = f"{course_id}/{instructor_email}/{file_name}"

    try:
        s3_client.upload_file(file_path, CHATLOGS_BUCKET, s3_key)
        logger.info(f"File uploaded successfully to S3: s3://{CHATLOGS_BUCKET}/{s3_key}")
        print(f"File uploaded successfully to S3: s3://{CHATLOGS_BUCKET}/{s3_key}")
        return f"s3://{CHATLOGS_BUCKET}/{s3_key}"
    except Exception as e:
        logger.error(f"Error uploading file to S3: {e}")
        raise

def update_completion_status(course_id, instructor_email, request_id):
    """
    Updates the completion status to True in the chatlogs_notifications table.
    """
    connection = connect_to_db()
    if connection is None:
        error_message = "Database connection is unavailable."
        logger.error(error_message)
        raise Exception(error_message)

    try:
        cur = connection.cursor()
        update_query = """
            UPDATE chatlogs_notifications
            SET completion = TRUE
            WHERE course_id = %s AND instructor_email = %s AND request_id = %s;
        """
        cur.execute(update_query, (course_id, instructor_email, request_id))
        connection.commit()
        cur.close()
        logger.info(f"Completion status updated for course_id: {course_id}, instructor_email: {instructor_email}, request_id: {request_id}.")
        print(f"Completion status updated for course_id: {course_id}, instructor_email: {instructor_email}, request_id: {request_id}.")
    except Exception as e:
        if cur:
            cur.close()
        connection.rollback()
        logger.error(f"Error updating completion status for course_id {course_id}, instructor_email {instructor_email}, request_id {request_id}: {e}")
        raise


def invoke_event_notification(request_id, message="Chat logs successfully uploaded"):
    try:
        query = """
        mutation sendNotification($message: String!, $request_id: String!) {
            sendNotification(message: $message, request_id: $request_id) {
                message
                request_id
            }
        }
        """
        headers = {"Content-Type": "application/json", "Authorization": "API_KEY"}
        payload = {
            "query": query,
            "variables": {
                "message": message,
                "request_id": request_id,
            }
        }

        # Delay to ensure client subscribes before mutation is sent 
        time.sleep(1)

        # Send the request to AppSync
        with httpx.Client() as client:
            response = client.post(APPSYNC_API_URL, headers=headers, json=payload)
            response_data = response.json()

            logger.info(f"RESPONSE: {response}")
            print(f"RESPONSE: {response}")

            if response.status_code != 200 or "errors" in response_data:
                logger.error(f"Failed to send notification to AppSync: {response_data}")
                raise Exception(f"Failed to send notification: {response_data}")

            logger.info(f"Notification sent successfully: {response_data}")
            print(f"Notification sent successfully: {response_data}")
    except Exception as e:
        logger.error(f"Error invoking AppSync notification: {e}")
        raise


def handler(event, context):
    try:
        if "Records" not in event:
            logger.error("Invalid event format: missing 'Records'.")
            raise ValueError("Event does not contain 'Records'.")

        for record in event["Records"]:
            try:
                message_body = json.loads(record["body"])
                course_id = message_body.get("course_id")
                instructor_email = message_body.get("instructor_email")
                request_id = message_body.get("request_id")

                if not course_id or not instructor_email or not request_id:
                    logger.error("Missing required parameters: course_id or instructor_email or request_id.")
                    continue

                chat_logs = query_chat_logs(course_id)
                print("GOT chat_logs")
                csv_path, csv_name = write_to_csv(chat_logs, course_id, instructor_email)
                print("GOT got csv_path and csv_name")
                s3_uri = upload_to_s3(csv_path, course_id, instructor_email, csv_name)
                print("GOT s3_uri")
                update_completion_status(course_id, instructor_email, request_id)
                print("Updating completion status")
                invoke_event_notification(request_id, message=f"Chat logs uploaded to {s3_uri}")
                print("FINALLY SENT NOTIFICATION")

            except Exception as e:
                logger.error(f"Error processing SQS message: {e}")
                continue

        return {"statusCode": 200, "body": json.dumps({"message": "Processing completed successfully."})}

    except Exception as e:
        logger.error(f"Unhandled error in sqsTrigger handler: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}