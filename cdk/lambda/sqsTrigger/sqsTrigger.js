exports.handler = async (event) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    console.log("Processing message:", body);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello World!" }),
  };
};