const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const { instructor_email, course_id } = JSON.parse(event.body);

    if (!instructor_email || !course_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing instructor_email or course_id" }),
      };
    }

    const params = {
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify({ instructor_email, course_id }),
      MessageGroupId: course_id, // FIFO requires group ID
      MessageDeduplicationId: `${instructor_email}-${course_id}`, // Deduplication ID
    };

    const command = new SendMessageCommand(params);
    await sqsClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Job submitted successfully" }),
    };
  } catch (error) {
    console.error("Error submitting job to SQS:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};