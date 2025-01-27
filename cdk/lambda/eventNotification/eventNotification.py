import json
import os
import boto3

def lambda_handler(event, context):
    print(f"Event Received: {json.dumps(event)}")
    try:
        # Extract arguments from the AppSync payload
        arguments = event.get("arguments", {})
        course_id = arguments.get("course_id", "DefaultCourseId")
        instructor_email = arguments.get("instructor_email", "DefaultInstructorEmail")
        request_id = arguments.get("request_id", "DefaultRequestId")
        message = arguments.get("message", "Default message")

        # Log the extracted values for debugging
        print(f"Extracted course_id: {course_id}, instructor_email: {instructor_email}, request_id: {request_id}, message: {message}")

        # Return the values back to AppSync
        return {
            "course_id": course_id,
            "instructor_email": instructor_email,
            "request_id": request_id,
            "message": message
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            "error": str(e)
        }