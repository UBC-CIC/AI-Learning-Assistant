import os
import boto3
import json
import logging
import psycopg2

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb_client = boto3.client('dynamodb')

TABLE_NAME = "API-Gateway-Test-Table-Name"
DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]

def get_secret():
    # secretsmanager client to get db credentials
    sm_client = boto3.client("secretsmanager")
    response = sm_client.get_secret_value(SecretId=DB_SECRET_NAME)["SecretString"]
    secret = json.loads(response)
    return secret

def connect_to_db():
    try:
        db_secret = get_secret()
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

def delete_last_two_db_messages(session_id):
    connection = connect_to_db()
    if connection is None:
        logger.error("No database connection available.")
        return None
    try:
        cur = connection.cursor()

        cur.execute("""
            SELECT message_id 
            FROM "Messages" 
            WHERE session_id = %s
            ORDER BY time_sent DESC
            LIMIT 2;
        """, (session_id,))
        
        messages = cur.fetchall()

        if len(messages) < 2:
            logger.info(f"Not enough messages to delete for session_id: {session_id}")
            return False
        
        message_ids = tuple([msg['message_id'] for msg in messages])
        cur.execute("""
            DELETE FROM "Messages"
            WHERE message_id IN %s;
        """, (message_ids,))
        
        connection.commit()
        cur.close()
        connection.close()
        logger.info(f"Successfully deleted the last two messages for session_id: {session_id}")
        return True

    except Exception as e:
        logger.error(f"Error deleting messages from database: {e}")
        if cur:
            cur.close()
        if connection:
            connection.rollback()
            connection.close()
        return False

def lambda_handler(event, context):
    query_params = event.get("queryStringParameters", {})

    session_id = query_params.get("session_id", "")

    if not session_id:
        logger.error("Missing required parameter: session_id")
        return {
            'statusCode': 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Missing required parameter: session_id')
        }
    
    try:
        # Fetch the conversation history from DynamoDB
        response = dynamodb_client.get_item(
            TableName=TABLE_NAME,
            Key={
                'SessionId': {
                    'S': session_id
                }
            }
        )

        if 'Item' not in response or 'History' not in response['Item']:
            logger.error(f"No conversation history found for session_id: {session_id}")
            return {
                'statusCode': 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                'body': json.dumps(f"No conversation history found for session_id: {session_id}")
            }

        history = response['Item']['History']['L']
        
        # There must be 2 messages in the history, 1 from AI and 1 from student
        if len(history) < 2:
            logger.info("Not enough messages to delete.")
            return {
                'statusCode': 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                'body': json.dumps(f"Not enough messages to delete for session_id: {session_id}")
            }

        # Remove the last AI and human messages by popping the last two elements
        history.pop()
        history.pop()

        # Update the conversation history in DynamoDB
        dynamodb_client.update_item(
            TableName=TABLE_NAME,
            Key={
                'SessionId': {
                    'S': session_id
                }
            },
            UpdateExpression="SET History = :history",
            ExpressionAttributeValues={
                ":history": {"L": history}
            }
        )

        logger.info(f"Successfully deleted the last human and AI messages in DynamoDB for session_id: {session_id}")

        if delete_last_two_db_messages(session_id):
            logger.info(f"Successfully deleted the last human and AI messages in RDS for session_id: {session_id}")
            return {
                'statusCode': 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                'body': json.dumps(f"Successfully deleted the last human and AI messages for session_id: {session_id}")
            }
        else:
            logger.error(f"Failed to delete the last human and AI messages in RDS for session_id: {session_id}")
            return {
                'statusCode': 500,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                'body': json.dumps(f"Error deleting last messages from the database for session_id: {session_id}")
            }

    except Exception as e:
        logger.error(f"Error deleting last message: {e}")
        return {
            'statusCode': 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps(f"Error deleting last message: {e}")
        }