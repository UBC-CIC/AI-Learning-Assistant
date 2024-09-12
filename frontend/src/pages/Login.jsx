import { useState } from "react";
// amplify
import {
  signIn,
  signUp,
  confirmSignIn,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  fetchAuthSession,
} from "aws-amplify/auth";
// MUI
import {
  Button,
  CssBaseline,
  TextField,
  Link,
  Paper,
  Grid,
  Box,
  Typography,
} from "@mui/material";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// login assets
import loginframe from "../assets/loginframe.png";
import PageContainer from "./Container";
// cognito verifier
import { CognitoJwtVerifier } from "aws-jwt-verify";
// MUI theming
import { createTheme, ThemeProvider } from "@mui/material/styles";
const { palette } = createTheme();
const { augmentColor } = palette;
const createColor = (mainColor) => augmentColor({ color: { main: mainColor } });
const theme = createTheme({
  palette: {
    primary: createColor("#5536DA"),
    bg: createColor("#F8F9FD"),
  },
});

export const Login = () => {
  // auth account variables
  const [newSignUp, setNewSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newPassword, setNewPassword] = useState(false);
  const [newUserPassword, setNewUserPassword] = useState(false);
  // auth status variables
  const [signUpConfirmation, setSignUpConfirmation] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmationError, setConfirmationError] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [step, setStep] = useState("requestReset");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const verifyJwtToken = async (token) => {
    try {
      const verifier = CognitoJwtVerifier.create({
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
        tokenUse: "id", // Can be either 'id' or 'access'
        clientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
      });
      // Verify the token
      const payload = await verifier.verify(token);

      // Check if 'groups' property is present
      if (payload["cognito:groups"]) {
        console.log("Groups:", payload["cognito:groups"]);
      } else {
        console.log("No groups found in the token.");
      }

      return payload;
    } catch (error) {
      console.error("Token verification failed:", error);
      throw new Error("Unauthorized jwt token");
    }
  };

  // existing user sign in
  const handleSignIn = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      const user = await signIn({
        username: username,
        password: password,
      });
      console.log(
        "USER SUCCESSFULLY LOGGED IN:",
        user.isSignedIn,
        user.nextStep.signInStep
      );
      if (!user.isSignedIn) {
        if (
          user.nextStep.signInStep ===
          "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
        ) {
          setNewUserPassword(true);
          setLoading(false);
        } else if (user.nextStep.signInStep === "CONFIRM_SIGN_UP") {
          setSignUpConfirmation(true);
          setLoading(false);
        }
      } else {
        setNewSignUp(false);
        window.location.reload();
      }
    } catch (error) {
      toast.error(`Error logging in: ${error}`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      console.log("Error logging in:", error);
      setLoading(false);
    }
  };

  // user signs up
  const handleSignUp = async (event) => {
    event.preventDefault();
    if (
      username == "" ||
      password == "" ||
      confirmPassword == "" ||
      firstName == "" ||
      lastName == ""
    ) {
      toast.error("All fields are required", {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      return;
    }
    // password specifications
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      toast.error("Passwords do not match", {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      return;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      toast.error("Password must be at least 8 characters long", {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      return;
    }
    setPasswordError("");
    try {
      setLoading(true);
      console.log("signing up");
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: username,
        password: password,
        attributes: {
          email: username,
        },
      });
      console.log("signed up");
      setNewSignUp(false);
      console.log("User signed up:", isSignUpComplete, userId, nextStep);
      if (!isSignUpComplete) {
        if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
          setSignUpConfirmation(true);
          setLoading(false);
        }
      }
    } catch (error) {
      toast.error(`Error signing up: ${error}`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      console.log("Error signing up:", error);
      setLoading(false);
      setError(error.message);
    }
  };

  // user gets new password
  const handleNewUserPassword = async (event) => {
    event.preventDefault();
    const newPassword = event.target.newPassword.value;
    const confirmNewPassword = event.target.confirmNewPassword.value;

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match!");
      toast.error(`Passwords do not match!`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      return;
    }
    setPasswordError("");
    try {
      setLoading(true);
      console.log("Setting new password for user:", username);
      const attributes = {};
      const user = await confirmSignIn({
        challengeResponse: newPassword,
        options: {
          userAttributes: attributes,
        },
      });
      console.log("User logged in:", user.isSignedIn, user.nextStep.signInStep);
      if (user.isSignedIn) {
        window.location.reload();
      }
    } catch (error) {
      toast.error(`Error: ${error}`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      console.log("Error setting new password:", error);
      setLoading(false);
      setNewUserPassword(false);
    }
  };

  // user signup confirmation
  const handleConfirmSignUp = async (event) => {
    event.preventDefault();
    const confirmationCode = event.target.confirmationCode.value;
    try {
      setLoading(true);
      await confirmSignUp({
        username: username,
        confirmationCode: confirmationCode,
      });

      console.log("code", confirmationCode);

      // Automatically log in the user
      const user = await signIn({
        username: username,
        password: password,
      });

      console.log("handle auto sign in", user.isSignedIn);

      if (user.isSignedIn) {
        // Send user data to backend
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();

        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }student/create_user?user_email=${encodeURIComponent(
            username
          )}&username=${encodeURIComponent(
            username
          )}&first_name=${encodeURIComponent(
            firstName
          )}&last_name=${encodeURIComponent(
            lastName
          )}&preferred_name=${encodeURIComponent(firstName)}`,
          {
            method: "POST",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        console.log("Response from backend:", data);

        setLoading(false);
        setNewSignUp(false);
        window.location.reload();
      } else {
        setLoading(false);
        setError("Automatic login failed. Please try signing in manually.");
      }
    } catch (error) {
      toast.error(`Error: ${error}`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      console.log("Error confirming sign-up:", error);
      setLoading(false);
      setConfirmationError(error.message);
    }
  };

  const resendConfirmationCode = async () => {
    try {
      setLoading(true);
      await resendSignUpCode({ username: username });
      setLoading(false);
      setConfirmationError("");
    } catch (error) {
      toast.error(`Error: ${error}`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      console.log("Error resending confirmation code:", error);
      setLoading(false);
    }
  };

  // user reset password
  async function handleResetPassword(username) {
    try {
      const output = await resetPassword({ username });
      handleResetPasswordNextSteps(output);
      console.log("username", username);
    } catch (error) {
      toast.error(`Error: ${error}`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      console.log(error);
      setError(error.message);
      setMessage("");
    }
  }

  function handleResetPasswordNextSteps(output) {
    const { nextStep } = output;
    switch (nextStep.resetPasswordStep) {
      case "CONFIRM_RESET_PASSWORD_WITH_CODE":
        // eslint-disable-next-line no-case-declarations
        const codeDeliveryDetails = nextStep.codeDeliveryDetails;
        console.log(
          `Confirmation code was sent to ${codeDeliveryDetails.deliveryMedium}`
        );
        setMessage(
          `Confirmation code was sent to ${codeDeliveryDetails.deliveryMedium}`
        );
        setStep("confirmReset");
        break;
      case "DONE":
        setMessage("Successfully reset password.");
        setStep("done");
        console.log("Successfully reset password.");
        break;
    }
  }

  async function handleConfirmResetPassword(event) {
    event.preventDefault();
    try {
      await confirmResetPassword({
        username,
        confirmationCode,
        newPassword,
      });
      console.log("username", username);
      setMessage("Password successfully reset.");
      setStep("done");
      setError("");
    } catch (error) {
      toast.error(`Error: ${error}`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      console.log(error);
      console.log(username);
      console.log(confirmationCode);
      setError(error.message);
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <PageContainer>
        <Grid container component="main" sx={{ height: "100vh" }}>
          <CssBaseline />
          <Grid
            item
            xs={false}
            sm={3}
            md={5}
            sx={{
              background: `linear-gradient(189deg, #d5e1ff, #dcbfe3)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="h4"
              sx={{ color: "black", fontWeight: "bold", textAlign: "center" }}
            >
              Welcome to
              <br />
              AI Learning Assistant 👋
            </Typography>
          </Grid>
          {/* existing user sign in */}
          {!loading &&
            !newUserPassword &&
            !newSignUp &&
            !signUpConfirmation &&
            !forgotPassword && (
              <Grid
                item
                xs={12}
                sm={9}
                md={7}
                component={Paper}
                square
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    my: 8,
                    mx: 4,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <Typography component="h1" variant="h5">
                    Sign in
                  </Typography>
                  <Box
                    component="form"
                    noValidate
                    onSubmit={handleSignIn}
                    sx={{ mt: 1 }}
                  >
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="email"
                      label="Email Address"
                      name="email"
                      autoComplete="email"
                      autoFocus
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      inputProps={{ maxLength: 40 }}
                    />
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      name="password"
                      label="Password"
                      type="password"
                      id="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      inputProps={{ maxLength: 50 }}
                    />
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      color="primary"
                      sx={{ mt: 3, mb: 2 }}
                    >
                      Sign In
                    </Button>
                    <Grid container>
                      <Grid item xs={6}>
                        <Link
                          href="#"
                          variant="body2"
                          onClick={() => setForgotPassword(true)}
                        >
                          Forgot password?
                        </Link>
                      </Grid>
                      <Grid item xs={6}>
                        <Link
                          href="#"
                          variant="body2"
                          onClick={() => setNewSignUp(true)}
                        >
                          {"Create your account"}
                        </Link>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              </Grid>
            )}
          {/* The rest of your component logic remains unchanged */}
        </Grid>
      </PageContainer>
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </ThemeProvider>
  );
};

export default Login;
