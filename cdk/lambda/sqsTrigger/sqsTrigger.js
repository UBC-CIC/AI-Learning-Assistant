const AWS = require("aws-sdk");
const { parse } = require("json2csv");
const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch");

const S3 = new AWS.S3();
const BUCKET_NAME = process.env.BUCKET_NAME;
const APPSYNC_API_URL = process.env.APPSYNC_API_URL;

exports.handler = async (event) => {
  for (const record of event.Records) {
    try {
      const { instructor_email, course_id } = JSON.parse(record.body);
      const chatLogs = await fetchChatLogs(course_id);
      const csv = parse(chatLogs);

      // Upload CSV to S3
      const fileKey = `chatlogs/${course_id}/${uuidv4()}.csv`;
      await S3.putObject({
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: csv,
        ContentType: "text/csv",
      }).promise();

      // Notify AppSync
      await notifyAppSync(course_id, fileKey);
    } catch (error) {
      console.error("Error:", error);
    }
  }
};

async function fetchChatLogs(course_id) {
  return [{ user: "Student1", message: "Hello", timestamp: "2024-06-10T10:00:00Z" }];
}

async function notifyAppSync(course_id, fileKey) {
  const mutation = `
    mutation NotifyCSVGenerated($course_id: String!, $fileKey: String!) {
      notifyCSVGenerated(course_id: $course_id, fileKey: $fileKey)
    }
  `;

  await fetch(APPSYNC_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: mutation,
      variables: { course_id, fileKey },
    }),
  });
}
