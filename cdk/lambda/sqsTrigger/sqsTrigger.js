const AWS = require("aws-sdk");
const { parse } = require("json2csv");
const { v4: uuidv4 } = require("uuid");

// Initialize AWS clients
const S3 = new AWS.S3();
const AppSync = new AWS.AppSync(); // For notifying AppSync WebSocket
const BUCKET_NAME = process.env.BUCKET_NAME;
const APPSYNC_API_URL = process.env.APPSYNC_API_URL;

exports.handler = async (event) => {
  for (const record of event.Records) {
    try {
      // Parse SQS message
      const { instructor_email, course_id } = JSON.parse(record.body);
      console.log("Processing course_id:", course_id);

      // Simulate fetching chat logs from a database
      const chatLogs = await fetchChatLogs(course_id);

      // Convert chat logs to CSV
      const csv = parse(chatLogs);

      // Generate a unique file name and upload CSV to S3
      const fileKey = `chatlogs/${course_id}/${uuidv4()}.csv`;
      await S3.putObject({
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: csv,
        ContentType: "text/csv",
      }).promise();

      console.log("CSV uploaded to S3:", fileKey);

      // Notify AppSync WebSocket
      await notifyAppSync(course_id, fileKey);
      console.log("Notification sent to AppSync WebSocket");

    } catch (error) {
      console.error("Error processing record:", error);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Messages processed successfully." }),
  };
};

async function fetchChatLogs(course_id) {
  // Simulate fetching logs from a database
  console.log(`Fetching logs for course_id: ${course_id}`);
  return [
    { user: "Student1", message: "Hello!", timestamp: "2024-06-10T10:00:00Z" },
    { user: "Student2", message: "Hi there!", timestamp: "2024-06-10T10:01:00Z" },
  ];
}

async function notifyAppSync(course_id, fileKey) {
  const mutation = `
    mutation NotifyCSVGenerated($course_id: String!, $fileKey: String!) {
      notifyCSVGenerated(course_id: $course_id, fileKey: $fileKey)
    }
  `;

  const fetch = require("node-fetch");
  const response = await fetch(APPSYNC_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: mutation,
      variables: { course_id, fileKey },
    }),
  });

  return response.json();
}
