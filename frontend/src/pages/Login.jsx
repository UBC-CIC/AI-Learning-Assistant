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
        console.log("Groups:");
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

  const handleSignUp = async (event) => {
    event.preventDefault();

    // Check for empty fields
    if (!username || !password || !confirmPassword || !firstName || !lastName) {
      toast.error("All fields are required", {
        position: "top-center",
        autoClose: 3000,
        theme: "colored",
      });
      return;
    }

    // Password validation: match, length, uppercase, lowercase, and number
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      toast.error("Passwords do not match", { theme: "colored" });
      return;
    }

    if (password.length < 10) {
      setPasswordError("Password must be at least 10 characters long");
      toast.error("Password must be at least 10 characters long", { theme: "colored" });
      return;
    }

    if (!/[a-z]/.test(password)) {
      setPasswordError("Password must contain at least one lowercase letter");
      toast.error("Password must contain at least one lowercase letter", { theme: "colored" });
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setPasswordError("Password must contain at least one uppercase letter");
      toast.error("Password must contain at least one uppercase letter", { theme: "colored" });
      return;
    }

    if (!/[0-9]/.test(password)) {
      setPasswordError("Password must contain at least one number");
      toast.error("Password must contain at least one number", { theme: "colored" });
      return;
    }
    if (!/[^a-zA-Z0-9\s]/.test(password)) {
      setPasswordError("Password must contain at least one special character");
      toast.error("Password must contain at least one special character", { theme: "colored" });
      return;
    }

    setPasswordError(""); // Clear any previous errors

    try {
      setLoading(true);
      console.log("signing up");

      const { isSignUpComplete, nextStep } = await signUp({
        username: username,
        password: password,
        attributes: {
          email: username,
        },
      });

      console.log("signed up successfully:", isSignUpComplete, nextStep);

      setNewSignUp(false);
      if (!isSignUpComplete && nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
        setSignUpConfirmation(true); // Transition to confirmation UI
        toast.success("Account created. Check your email for the confirmation code.", {
          theme: "colored",
        });
      }
    } catch (error) {
      const errorMessage =
        error.message.includes("PreSignUp failed with error")
          ? "Your email domain is not allowed. Please use a valid email address."
          : `Error signing up: ${error.message}`;
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 3000,
        theme: "colored",
      });
      console.log("Error signing up:", error);
      setLoading(false);
      setError(error.message);
    } finally {
      setLoading(false);
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
      const attributes = {};
      const user = await confirmSignIn({
        challengeResponse: newPassword,
        options: {
          userAttributes: attributes,
        },
      });
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
      // Automatically log in the user
      const user = await signIn({
        username: username,
        password: password,
      });
      if (user.isSignedIn) {
        // Send user data to backend
        const session = await fetchAuthSession();
        const token = session.tokens.idToken

        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT
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
    } catch (error) {
      toast.error(`Error Reseting Password`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      setMessage("");
    }
  }

  function handleResetPasswordNextSteps(output) {
    const { nextStep } = output;
    switch (nextStep.resetPasswordStep) {
      case "CONFIRM_RESET_PASSWORD_WITH_CODE":
        // eslint-disable-next-line no-case-declarations
        const codeDeliveryDetails = nextStep.codeDeliveryDetails;
        setMessage(
          `Confirmation code was sent to ${codeDeliveryDetails.deliveryMedium}`
        );
        setStep("confirmReset");
        break;
      case "DONE":
        setMessage("Successfully reset password.");
        setStep("done");
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
          {newSignUp && (
            <Grid item xs={12} sm={9} md={7} component={Paper} square>
              <Box
                sx={{
                  my: 8,
                  mx: 4,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Typography component="h1" variant="h5" paddingBottom={3}>
                  Create your account
                </Typography>

                <Box sx={{ mt: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        autoComplete="given-name"
                        name="firstName"
                        required
                        fullWidth
                        id="firstName"
                        label="First Name"
                        autoFocus
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        inputProps={{ maxLength: 30 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        id="lastName"
                        label="Last Name"
                        name="lastName"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        inputProps={{ maxLength: 30 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        inputProps={{ maxLength: 40 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        inputProps={{ maxLength: 50 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        name="confirmPassword"
                        label="Confirm password"
                        type="password"
                        id="confirmPassword"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        inputProps={{ maxLength: 50 }}
                      />
                    </Grid>
                  </Grid>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    align="center"
                    paddingBottom={2}
                    marginTop={2}
                  >
                    Providing personal information is optional and entirely at
                    your discretion. You can use this app without sharing any
                    personal details beyond those necessary for account setup.
                  </Typography>

                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleSignUp}
                    sx={{ mt: 3, mb: 2 }}
                  >
                    Sign Up
                  </Button>
                  <Grid container>
                    <Grid item xs>
                      <Link
                        href="#"
                        variant="body2"
                        onClick={() => setNewSignUp(false)}
                      >
                        Already have an account? {"Sign in"}
                      </Link>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </Grid>
          )}
          {/* new user change password  */}
          {!loading && newUserPassword && (
            <Box
              sx={{
                my: 8,
                mx: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography component="h1" variant="h5" paddingBottom={3}>
                New User
              </Typography>
              <p className="text-sm">
                Please enter a new password for your account.
              </p>
              <div className="flex flex-col items-center justify-center">
                <form onSubmit={handleNewUserPassword}>
                  <input
                    className="input input-bordered mt-1 h-10 w-full text-xs"
                    name="newPassword"
                    placeholder="New Password"
                    type="password"
                    required
                  />
                  <input
                    className="input input-bordered mt-1 h-10 w-full text-xs"
                    name="confirmNewPassword"
                    placeholder="Confirm New Password"
                    type="password"
                    required
                  />
                  {passwordError && (
                    <div className="block text-m mb-1 mt-6 text-red-600">
                      {passwordError}
                    </div>
                  )}
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    sx={{ mt: 3, mb: 2 }}
                  >
                    Submit New Password
                  </Button>
                </form>
              </div>
            </Box>
          )}
          {/* new user confirm signup  */}
          {!loading && signUpConfirmation && (
            <Box
              sx={{
                my: 8,
                mx: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                margin: "0 auto", // Center the content horizontally
                justifyContent: "center", // Center the content vertically

              }}
            >
              <Typography component="h1" variant="h5" paddingBottom={3}>
                Account not verified
              </Typography>
              <p className="text-sm">
                Please enter the confirmation code sent to your email.
              </p>
              <div className="flex flex-col items-center justify-center">
                <form onSubmit={handleConfirmSignUp}>
                  <input
                    className="input input-bordered mt-1 h-10 w-full text-xs bg-gray-200 border border-gray-400 rounded pl-2"
                    name="confirmationCode"
                    placeholder="Confirmation Code"
                    type="password"
                    maxLength={15}
                    required
                  />
                  {confirmationError && (
                    <div className="block text-m mb-1 mt-6 text-red-600">
                      {confirmationError}
                    </div>
                  )}
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    sx={{ mt: 3, mb: 2 }}
                  >
                    Submit
                  </Button>
                  <Button
                    type="button"
                    fullWidth
                    variant="contained"
                    color="primary"
                    sx={{ mt: 3, mb: 2 }}
                    onClick={resendConfirmationCode}
                  >
                    Resend Code
                  </Button>
                </form>
              </div>
            </Box>
          )}
          {/* forgot password?  */}
          {!loading && forgotPassword && (
            <Grid
              item
              xs={12}
              sm={12}
              md={7}
              component={Paper}
              square
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh", // Center vertically and horizontally
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "100%",
                  maxWidth: "500px", // Adjust for a clean form size
                  padding: 4, // Spacing around content
                }}
              >
                {/* Title */}
                <Typography
                  component="h1"
                  variant="h5"
                  sx={{
                    mb: 3,
                    textAlign: "center",
                    fontSize: "1.8rem", // Match font size with Sign In
                  }}
                >
                  Reset Password
                </Typography>

                {/* Request Reset */}
                {step === "requestReset" && (
                  <>
                    <TextField
                      label="Email Address"
                      type="email"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      fullWidth
                      margin="normal"
                      inputProps={{ maxLength: 40 }}
                      sx={{
                        fontSize: "1rem", // Ensure input matches font size
                      }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleResetPassword(username)}
                      fullWidth
                      sx={{
                        mt: 3,
                        mb: 2,
                        py: 1.2, // Vertical padding for height consistency
                        fontSize: "1rem", // Match button text font size
                      }}
                    >
                      Send Reset Code
                    </Button>
                  </>
                )}

                {/* Confirm Reset */}
                {step === "confirmReset" && (
                  <Box component="form" noValidate onSubmit={handleConfirmResetPassword}>
                    <TextField
                      label="Confirmation Code"
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value)}
                      fullWidth
                      margin="normal"
                      inputProps={{ maxLength: 15 }}
                      sx={{ fontSize: "1rem" }}
                    />
                    <TextField
                      label="New Password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      fullWidth
                      margin="normal"
                      inputProps={{ maxLength: 50 }}
                      sx={{ fontSize: "1rem" }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      fullWidth
                      sx={{
                        mt: 3,
                        mb: 2,
                        py: 1.2,
                        fontSize: "1rem",
                        fontWeight: "bold",
                      }}
                    >
                      Reset Password
                    </Button>
                  </Box>
                )}

                {/* Success Message */}
                {step === "done" && (
                  <Typography
                    color="primary"
                    sx={{ mt: 3, textAlign: "center", fontSize: "1.2rem" }}
                  >
                    Password has been successfully reset.
                  </Typography>
                )}

                {/* Error Message */}
                {error && (
                  <Typography
                    color="error"
                    sx={{ mt: 2, textAlign: "center", fontSize: "1rem" }}
                  >
                    {error}
                  </Typography>
                )}

                {/* Remember Password Link */}
                <Link
                  href="#"
                  variant="body2"
                  onClick={() => setForgotPassword(false)}
                  sx={{
                    mt: 3,
                    textAlign: "center",
                    display: "block",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    color: "primary.main", // Match link color
                  }}
                >
                  Remember your Password? <strong>Sign in</strong>
                </Link>
              </Box>
            </Grid>
          )}


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
