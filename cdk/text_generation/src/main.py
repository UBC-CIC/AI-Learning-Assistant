import numpy as np
import json

def handler(event, context):
    # Extract the parameter from the event
    input_value = event.get("queryStringParameters", {}).get("input_value", "No input provided")
    
    # Generate a random 3x3 array
    arr = np.random.randint(0, 10, (3, 3))
    
    # Create the response body
    response_body = {
        "message": f"Received input: {input_value}",
        "array": arr.tolist(),
    }
    
    # Return the response with the status code and body
    return {
        "statusCode": 200,
        "body": json.dumps(response_body),
        "headers": {
            "Content-Type": "application/json"
        }
    }