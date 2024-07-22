const AWS = require("aws-sdk");
const { CognitoJwtVerifier } = require("aws-jwt-verify");

// Gather AWS services
const secretsManager = new AWS.SecretsManager();

// Setting up evironments
let { SM_COGNITO_CREDENTIALS } = process.env;

// Return response
const responseStruct = {
    "principalId": "yyyyyyyy", // The principal user identification associated with the token sent by the client.
    "policyDocument": {
        "Version": "2012-10-17",
        "Statement": []
    },
    "context": {}
};

// Create the verifier outside the Lambda handler (= during cold start),
// so the cache can be reused for subsequent invocations. Then, only during the
// first invocation, will the verifier actually need to fetch the JWKS.
let jwtVerifier;

async function initializeConnection() {
    // Retrieve the secret from AWS Secrets Manager
    const secret = await secretsManager
        .getSecretValue({ SecretId: SM_COGNITO_CREDENTIALS })
        .promise();

    const credentials = JSON.parse(secret.SecretString);

    jwtVerifier = CognitoJwtVerifier.create({
        userPoolId: credentials.VITE_COGNITO_USER_POOL_ID,
        tokenUse: "access",
        groups: ['student', 'instructor', 'admin'],
        clientId: credentials.VITE_COGNITO_USER_POOL_CLIENT_ID,
    });
}

exports.handler = async (event) => {
    if (!jwtVerifier) {
        await initializeConnection();
    }
    const accessToken = event.authorizationToken;
    let payload;

    try {
        // If the token is not valid, an error is thrown:
        payload = await jwtVerifier.verify(accessToken);

        // Modify the response output
        const parts = event.methodArn.split('/');
        const resource = parts.slice(0, 2).join('/') + '*';
        responseStruct["principalId"] = payload.sub;
        responseStruct["policyDocument"]["Statement"].push({
            "Action": "execute-api:Invoke",
            "Effect": "Allow",
            "Resource": resource
        });
        responseStruct["context"] = {
            "userId": payload.sub
        };

        return responseStruct;
    } catch (e) {
        console.log(e);
        // API Gateway wants this *exact* error message, otherwise it returns 500 instead of 401:
        throw new Error("Unauthorized");
    }
};