const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { parse } = require("json2csv");
const { v4: uuidv4 } = require("uuid");

const BUCKET_NAME = process.env.BUCKET_NAME;
const APPSYNC_API_URL = process.env.APPSYNC_API_URL;

// Initialize S3 Client
const s3Client = new S3Client({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log("Event Received:", JSON.stringify(event));

  for (const record of event.Records) {
    try {
      // Parse SQS message body
      const { instructor_email, course_id } = JSON.parse(record.body);
      console.log("Parsed SQS Message:", { instructor_email, course_id });

      // Fetch chat logs
      const chatLogs = await fetchChatLogs(course_id);
      const csv = parse(chatLogs);
      console.log("Generated CSV Data:", csv);

      // Upload CSV to S3
      const fileKey = `chatlogs/${course_id}/${uuidv4()}.csv`;
      await uploadToS3(BUCKET_NAME, fileKey, csv);

      // Notify AppSync
      await notifyAppSync(course_id, fileKey);

      console.log("Successfully processed SQS record:", { course_id, fileKey });
    } catch (error) {
      console.error("Error processing SQS record:", error);
    }
  }
};

async function fetchChatLogs(course_id) {
  console.log(`Fetching chat logs for course: ${course_id}`);
  // Replace this with actual logic to fetch chat logs
  return [
    { user: "Student1", message: "Hello", timestamp: "2024-06-10T10:00:00Z" },
    { user: "Student2", message: "Hi!", timestamp: "2024-06-10T10:01:00Z" }
  ];
}

async function uploadToS3(bucket, key, data) {
  try {
    console.log(`Uploading file to S3: ${key}`);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: "text/csv",
    });
    await s3Client.send(command);
    console.log(`File uploaded successfully to S3: ${key}`);
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
}

async function notifyAppSync(course_id, fileKey) {
  const mutation = `
    mutation NotifyCSVGenerated($course_id: String!, $fileKey: String!) {
      notifyCSVGenerated(course_id: $course_id, fileKey: $fileKey)
    }
  `;

  try {
    console.log("Sending notification to AppSync...");
    const response = await fetch(APPSYNC_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: mutation,
        variables: { course_id, fileKey },
      }),
    });
    const responseData = await response.json();
    console.log("AppSync Response:", responseData);
  } catch (error) {
    console.error("Error notifying AppSync:", error);
    throw error;
  }
}

