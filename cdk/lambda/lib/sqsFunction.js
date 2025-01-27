const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { initializeConnection } = require("./lib.js");

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT } = process.env;
let sqlConnection = global.sqlConnection;

exports.handler = async (event) => {
  try {
    // Parse the incoming event
    console.log("Parsing instructor_email, course_id, and request_id");
    const { instructor_email, course_id, request_id } = JSON.parse(event.body);

    // Validate input
    if (!instructor_email || !course_id || !request_id) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
          "Access-Control-Allow-Methods": "OPTIONS,POST",
        },
        body: JSON.stringify({ error: "Missing instructor_email, course_id, or request_id" }),
      };
    }

    // Initialize database connection if not already established
    if (!sqlConnection) {
      await initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT);
      sqlConnection = global.sqlConnection;
    }

    // Insert the record into the chatlogs_notifications table
    console.log("Inserting record into the chatlogs_notifications table with completion status FALSE");
    await sqlConnection`
      INSERT INTO "chatlogs_notifications" ("course_id", "instructor_email", "completion")
      VALUES (${course_id}, ${instructor_email}, false)
      ON CONFLICT DO NOTHING;
    `;

    // Prepare the SQS message
    const params = {
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify({ instructor_email, course_id, request_id }),
      MessageGroupId: course_id, // FIFO requires group ID
      MessageDeduplicationId: `${instructor_email}-${course_id}-${request_id}`, // Deduplication ID
    };

    // Send the message to SQS
    console.log("Sending message to SQS");
    const command = new SendMessageCommand(params);
    await sqsClient.send(command);
    console.log("Message sent to SQS");

    // Return success response
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
      },
      body: JSON.stringify({ message: "Job submitted and notification logged successfully" }),
    };
  } catch (error) {
    console.error("Error processing SQS function:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
      },
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};