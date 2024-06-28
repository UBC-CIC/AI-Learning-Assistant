import React from "react";
import { Auth } from "aws-amplify";
import { AmplifySignIn, Authenticator } from "@aws-amplify/ui-react";
import {
  signIn,
  signUp,
  confirmSignIn,
  confirmSignUp,
  resendSignUpCode,
} from "aws-amplify/auth";

function Login() {
  return <p> hello </p>;
}

export default Login;
