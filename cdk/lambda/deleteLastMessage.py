import boto3
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb_client = boto3.client('dynamodb')

TABLE_NAME = "API-Gateway-Test-Table-Name"

def lambda_handler(event, context):
    query_params = event.get("queryStringParameters", {})

    session_id = query_params.get("session_id", "")

    if not session_id:
        logger.error("Missing required parameter: session_id")
        return {
            'statusCode': 400,
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
                'body': json.dumps(f"No conversation history found for session_id: {session_id}")
            }

        history = response['Item']['History']['L']
        
        # There must be 2 messages in the history, 1 from AI and 1 from student
        if len(history) < 2:
            logger.info("Not enough messages to delete.")
            return {
                'statusCode': 400,
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

        logger.info(f"Successfully deleted the last human and AI messages for session_id: {session_id}")
        return {
            'statusCode': 200,
            'body': json.dumps(f"Successfully deleted the last human and AI messages for session_id: {session_id}")
        }

    except Exception as e:
        logger.error(f"Error deleting last message: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps(f"Error deleting last message: {e}")
        }