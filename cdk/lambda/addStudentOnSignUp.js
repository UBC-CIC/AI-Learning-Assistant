const AWS = require('aws-sdk');

exports.handler = async (event, context, callback) => {
  const { userName, userPoolId } = event;

  try {
    // assign the user to student group
    await addUserToGroup({
      userPoolId,
      username: userName,
      groupName: 'student',
    });

    return callback(null, event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal Server Error',
      }),
    };
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
