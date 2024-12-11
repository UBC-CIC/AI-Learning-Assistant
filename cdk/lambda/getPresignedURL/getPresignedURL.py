import boto3
import os

s3 = boto3.client("s3")
BUCKET_NAME = os.environ["BUCKET_NAME"]

def lambda_handler(event, context):
    try:
        # Extract file key from query parameters
        file_key = event["queryStringParameters"]["fileKey"]

        # Generate presigned URL valid for 1 hour
        presigned_url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET_NAME, "Key": file_key},
            ExpiresIn=3600,
        )

        return {
            "statusCode": 200,
            "body": presigned_url,
        }
    except Exception as e:
        print("Error generating presigned URL:", e)
        return {
            "statusCode": 500,
            "body": str(e),
        }
