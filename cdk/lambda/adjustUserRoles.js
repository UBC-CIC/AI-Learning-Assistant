const { initializeConnection } = require("./lib.js");
const AWS = require("aws-sdk");
// Setting up evironments
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT } = process.env;

// SQL conneciton from global variable at lib.js
let sqlConnection = global.sqlConnection;

exports.handler = async (event) => {
  // Initialize the database connection if not already initialized
  if (!sqlConnection) {
    await initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT);
    sqlConnection = global.sqlConnection;
  }

  const { userName, userPoolId } = event;

  try {
    const cognitoIdp = new AWS.CognitoIdentityServiceProvider();
    const userGroups = await cognitoIdp
      .adminListGroupsForUser({
        UserPoolId: userPoolId,
        Username: userName,
      })
      .promise();

    const groups = userGroups.Groups.map((group) => group.GroupName);
    console.log(`User's groups: ${groups}`);

    // Get user attributes
    const userAttributes = await cognitoIdp
      .adminGetUser({
        UserPoolId: userPoolId,
        Username: userName,
      })
      .promise();

    // Extract the email attribute
    const emailAttr = userAttributes.UserAttributes.find(attr => attr.Name === 'email');
    const email = emailAttr ? emailAttr.Value : null;

    console.log(`User email: ${email}`);

    // Insert the new user into Users table
    const userData = await sqlConnection`
      UPDATE "Users"
      SET roles = ${groups}
      WHERE user_email = ${email};
    `;

    console.log(userData)
    return event;
  } catch (err) {
    console.log(err);
    return event;
  }
  return event;
};
