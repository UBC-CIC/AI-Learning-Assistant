const { initializeConnection } = require("./lib.js");
const AWS = require("aws-sdk");

let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT } = process.env;
let sqlConnection = global.sqlConnection;

exports.handler = async (event) => {
  if (!sqlConnection) {
    await initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT);
    sqlConnection = global.sqlConnection;
  }

  const { userName, userPoolId } = event;

  try {
    const cognitoIdp = new AWS.CognitoIdentityServiceProvider();
    // Get user attributes from Cognito to retrieve the email
    const userAttributes = await cognitoIdp
      .adminGetUser({
        UserPoolId: userPoolId,
        Username: userName,
      })
      .promise();

    const emailAttr = userAttributes.UserAttributes.find(
      (attr) => attr.Name === "email"
    );
    const email = emailAttr ? emailAttr.Value : null;

    // Retrieve roles from the database
    const dbUser = await sqlConnection`
      SELECT roles FROM "Users" WHERE user_email = ${email};
    `;

    const dbRoles = dbUser[0]?.roles || [];

    // Determine the new Cognito group based on the roles
    const newGroupName = dbRoles.length > 0 ? dbRoles[0] : "student";

    // Add the user to the new group without removing existing groups
    await cognitoIdp
      .adminAddUserToGroup({
        UserPoolId: userPoolId,
        Username: userName,
        GroupName: newGroupName,
      })
      .promise();

    return event;
  } catch (err) {
    console.error("Error assigning user to group:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
      }),
    };
  }
};
