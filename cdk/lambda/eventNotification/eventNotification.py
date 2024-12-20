import json
import os
import boto3

APPSYNC_API_URL = os.environ["APPSYNC_API_URL"]
APPSYNC_API_ID = os.environ["APPSYNC_API_ID"]

def lambda_handler(event, context):
    print(f"Event Received: {json.dumps(event)}")
    try:
        # Extract arguments from the AppSync payload
        arguments = event.get("arguments", {})
        session_id = arguments.get("sessionId", "DefaultSessionId")
        message = arguments.get("message", "Default message")

        # Log the extracted values for debugging
        print(f"Extracted sessionId: {session_id}, message: {message}")

        # Return the values back to AppSync
        return {
            "sessionId": session_id,
            "message": message
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            "error": str(e)
        }