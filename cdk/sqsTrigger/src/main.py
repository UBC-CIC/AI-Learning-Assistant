import json

def lambda_handler(event, context):
    """
    Lambda function to process messages from SQS.
    Prints the received parameters for testing purposes.

    Args:
        event (dict): The event object containing SQS messages.
        context (LambdaContext): The runtime information provided by AWS Lambda.

    Returns:
        dict: A success message.
    """
    try:
        # Loop through the records in the event
        for record in event.get("Records", []):
            # Extract the body of the SQS message
            message_body = record.get("body")
            if message_body:
                # Parse the message body as JSON
                parameters = json.loads(message_body)
                print(f"Received parameters from SQS: {parameters}")
            else:
                print("Message body is empty or not provided in the SQS record")

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Messages processed successfully"})
        }
    except Exception as e:
        print(f"Error processing SQS message: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Internal Server Error"})
        }