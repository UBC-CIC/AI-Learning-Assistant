import React, { useState } from "react";
// amplify
import {
  signIn,
  signUp,
  confirmSignIn,
  confirmSignUp,
  resendSignUpCode,
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
import { createTheme, ThemeProvider } from "@mui/material/styles";
// login assets
import loginframe from "../assets/loginframe.png";
import PageContainer from "./container";

// MUI theming
const { palette } = createTheme();
const { augmentColor } = palette;
const createColor = (mainColor) => augmentColor({ color: { main: mainColor } });
const theme = createTheme({
  palette: {
    primary: createColor("#5536DA"),
  },
});

export const Login = () => {
  // auth account variables
  const [newSignUp, setNewSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [newPassword, setNewPassword] = useState(false);
  const [newUserPassword, setNewUserPassword] = useState(false);
  // auth status variables
  const [signUpConfirmation, setSignUpConfirmation] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmationError, setConfirmationError] = useState("");

  // existing user sign in
  const handleSignIn = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      const user = await signIn({
        username: username,
        password: password,
      });
      console.log("User logged in:", user.isSignedIn, user.nextStep.signInStep);
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
        window.location.reload();
      }
    } catch (error) {
      console.log("Error logging in:", error);
      setLoading(false);
    }
  };

  // user signs up
  const handleSignUp = async (event) => {
    event.preventDefault();
    const confirmPassword = event.target.confirmPassword.value;

    // password specifications
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }
    setPasswordError("");
    try {
      setLoading(true);
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: username,
        password: password,
        attributes: {
          email: username,
        },
      });
      setLoading(false);
      setNewSignUp(false);
      console.log("User signed up:", isSignUpComplete, userId, nextStep);
      if (!isSignUpComplete) {
        if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
          setSignUpConfirmation(true);
        }
      }
    } catch (error) {
      console.log("Error signing up:", error);
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
      const user = await confirmSignUp({
        username: username,
        confirmationCode: confirmationCode,
      });
      setLoading(false);
      console.log(
        "User logged in:",
        user.isSignUpComplete,
        user.nextStep.signInStep
      );
      if (user.isSignUpComplete) {
        window.location.reload();
      }
    } catch (error) {
      console.log("Error setting new password:", error);
      setConfirmationError("Invalid confirmation code");
      setLoading(false);
    }
  };

  const resendConfirmationCode = async () => {
    try {
      setLoading(true);
      await resendSignUpCode({ username: username });
      setLoading(false);
      setConfirmationError("");
    } catch (error) {
      console.log("Error resending confirmation code:", error);
      setLoading(false);
    }
  };

  const storeUser = async (first_name, last_name, email, role) => {
    setLoading(true);

    //sign in user
    try {
      const user = await signIn({
        username: username,
        password: password,
      });
      console.log("User logged in:", user.isSignedIn, user.nextStep.signInStep);
    } catch (error) {
      console.log("Error getting user:", error);
      setLoading(false);
      return;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <PageContainer>
        <Grid container component="main" sx={{ height: "100vh" }}>
          <CssBaseline />
          <Grid
            item
            xs={false}
            sm={4}
            md={7}
            sx={{
              backgroundImage: `url(${loginframe})`,
              backgroundColor: (t) =>
                t.palette.mode === "light"
                  ? t.palette.grey[50]
                  : t.palette.grey[900],
              backgroundSize: "cover",
              backgroundPosition: "left",
            }}
          />
          {/* existing user sign in  */}
          {!loading &&
            !newUserPassword &&
            !newSignUp &&
            !signUpConfirmation && (
              <Grid item xs={12} sm={8} md={5} component={Paper} square>
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
                      onChange={(e) => setUsername(e.target.value)}
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
                      onChange={(e) => setPassword(e.target.value)}
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
                          onSubmit
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
          {/* new user sign up  */}
          {newSignUp && (
            <Grid item xs={12} sm={8} md={5} component={Paper} square>
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
                <Box
                  component="form"
                  noValidate
                  onSubmit={handleSignUp}
                  sx={{ mt: 1 }}
                >
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
                        onChange={(e) => setFirstName(e.target.value)}
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
                        onChange={(e) => setLastName(e.target.value)}
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
                        onChange={(e) => setUsername(e.target.value)}
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
                        onChange={(e) => setPassword(e.target.value)}
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
                      />
                    </Grid>
                  </Grid>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    sx={{ mt: 3, mb: 2 }}
                  >
                    Sign Up
                  </Button>
                  <Grid container>
                    <Grid item xs>
                      <Link
                        href="#"
                        variant="body2"
                        onSubmit
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
            <div>
              <h1 className="text-3xl font-bold my-3 text-zinc-600">
                New User
              </h1>
              <p className="text-sm">
                Please enter a new password for your account.
              </p>
              <div className="flex flex-col items-center justify-center">
                <form onSubmit={handleNewPasswordUser}>
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
                  <button
                    className="btn btn-neutral mt-4 min-h-5 h-8 w-full"
                    type="submit"
                  >
                    Submit New Password
                  </button>
                </form>
              </div>
            </div>
          )}
          {/* new user confirm signup  */}
          {!loading && signUpConfirmation && (
            <div>
              <h1 className="text-3xl font-bold my-3 text-zinc-600">
                Account not confirmed
              </h1>
              <p className="text-sm">
                Please enter the confirmation code sent to your email.
              </p>
              <div className="flex flex-col items-center justify-center">
                <form onSubmit={handleConfirmSignUp}>
                  <input
                    className="input input-bordered mt-1 h-10 w-full text-xs"
                    name="confirmationCode"
                    placeholder="Confirmation Code"
                    type="password"
                    required
                  />
                  {confirmationError && (
                    <div className="block text-m mb-1 mt-6 text-red-600">
                      {confirmationError}
                    </div>
                  )}
                  <button
                    className="btn btn-neutral mt-4 min-h-5 h-8 w-full"
                    type="submit"
                  >
                    Submit
                  </button>
                  <button
                    className="btn btn-secondary mt-4 min-h-5 h-8 w-full"
                    type="button"
                    onClick={resendConfirmationCode}
                  >
                    Resend Code
                  </button>
                </form>
              </div>
            </div>
          )}
        </Grid>
      </PageContainer>
    </ThemeProvider>
  );
};

export default Login;
