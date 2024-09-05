const { initializeConnection } = require("./lib.js");
const AWS = require("aws-sdk");
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT } = process.env;
let sqlConnection = global.sqlConnection;

exports.handler = async (event, context, callback) => {
  if (!sqlConnection) {
    await initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT);
    sqlConnection = global.sqlConnection;
  }

  const { userName, userPoolId } = event;

  try {
    // Get user attributes
    const userAttributes = await sqlConnection`
      SELECT roles FROM "Users" WHERE user_email = ${userName};
    `;

    // Determine the group to assign based on the user's roles
    const roles = userAttributes.length > 0 ? userAttributes[0].roles : null;
    const groupName = roles ? roles : "student"; // Default to 'student' if no roles found

    // Assign the user to the appropriate group
    await addUserToGroup({
      userPoolId,
      username: userName,
      groupName: groupName,
    });

    return callback(null, event);
  } catch (error) {
    console.error("Error assigning user to group:", error);
    return callback(null, {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
      }),
    });
  }
};

async function addUserToGroup({ userPoolId, username, groupName }) {
  const params = {
    GroupName: groupName,
    UserPoolId: userPoolId,
    Username: username,
  };

  const cognitoIdp = new AWS.CognitoIdentityServiceProvider();
  await cognitoIdp.adminAddUserToGroup(params).promise();
}
