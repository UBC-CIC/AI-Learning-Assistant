import { Auth } from "aws-amplify";

// Gets current authorized user
export async function retrieveUser(setUser) {
  try {
    const returnedUser = await Auth.currentAuthenticatedUser();
    setUser(returnedUser);
  } catch (e) {
    console.log("error getting user: ", e);
  }
}

// Gets jwtToken for current session
export async function retrieveJwtToken(setJwtToken) {
  try {
    var session = await Auth.currentSession();
    var idToken = await session.getIdToken();
    var token = await idToken.getJwtToken();
    setJwtToken(token);
    // Check if the token is close to expiration
    const expirationTime = idToken.getExpiration() * 1000; // Milliseconds
    const currentTime = new Date().getTime();

    if (expirationTime - currentTime < 2700000) {
      // 45 minutes
      await Auth.currentSession();
      idToken = await session.getIdToken();
      token = await idToken.getJwtToken();
      setJwtToken(token);
    }
  } catch (e) {
    console.log("error getting token: ", e);
  }
}

// get temp AWS credentials
export function getIdentityCredentials(jwtToken, setCredentials) {
  const AWS = require("aws-sdk");
  const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID;
  const IDENTITY_POOL_ID = import.meta.env.VITE_IDENTITY_POOL_ID;
  const REGION = import.meta.env.VITE_AWS_REGION;

  const creds = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IDENTITY_POOL_ID,
    Logins: {
      [`cognito-idp.ca-central-1.amazonaws.com/${USER_POOL_ID}`]: jwtToken,
    },
  });

  AWS.config.update({
    region: REGION,
    credentials: creds,
  });

  AWS.config.credentials.get(function () {
    setCredentials(creds);
  });
}
