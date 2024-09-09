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

    // Get user groups from Cognito
    const userGroups = await cognitoIdp
      .adminListGroupsForUser({
        UserPoolId: userPoolId,
        Username: userName,
      })
      .promise();

    const cognitoRoles = userGroups.Groups.map((group) => group.GroupName);

    // Get user attributes
    const userAttributes = await cognitoIdp
      .adminGetUser({
        UserPoolId: userPoolId,
        Username: userName,
      })
      .promise();

    const emailAttr = userAttributes.UserAttributes.find(attr => attr.Name === 'email');
    const email = emailAttr ? emailAttr.Value : null;

    // Retrieve roles from the database
    const dbUser = await sqlConnection`
      SELECT roles FROM "Users"
      WHERE user_email = ${email};
    `;
    
    const dbRoles = dbUser[0]?.roles || [];

    // Handle role synchronization between Cognito and DB
    if (cognitoRoles.includes('admin')) {
      // If Cognito has admin, make sure DB is also admin
      if (!dbRoles.includes('admin')) {
        await sqlConnection`
          UPDATE "Users"
          SET roles = array_append(roles, 'admin')
          WHERE user_email = ${email};
        `;
        console.log('DB roles updated to include admin');
      }
    } else if (cognitoRoles.some(role => ['instructor', 'student'].includes(role))) {
      const cognitoNonAdminRole = cognitoRoles.find(role => ['instructor', 'student'].includes(role));
      
      if (dbRoles.includes('admin')) {
        // If DB has admin but Cognito is not admin, update DB role to match Cognito
        await sqlConnection`
          UPDATE "Users"
          SET roles = ${[cognitoNonAdminRole]}
          WHERE user_email = ${email};
        `;
        console.log(`DB roles updated to match Cognito (${cognitoNonAdminRole})`);
      } else if (dbRoles.length && dbRoles[0] !== cognitoNonAdminRole) {
        // If DB role doesn't match Cognito and isn't admin, update Cognito to match DB
        await cognitoIdp
          .adminRemoveUserFromGroup({
            UserPoolId: userPoolId,
            Username: userName,
            GroupName: cognitoNonAdminRole
          })
          .promise();

        await cognitoIdp
          .adminAddUserToGroup({
            UserPoolId: userPoolId,
            Username: userName,
            GroupName: dbRoles[0]
          })
          .promise();

        console.log(`Cognito roles updated to match DB (${dbRoles[0]})`);
      }
    }

    return event;
  } catch (err) {
    console.log(err);
    return event;
  }
};
