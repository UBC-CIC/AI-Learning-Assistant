import React, { useState } from "react";
// amplify
import {
  signIn,
  signUp,
  confirmSignIn,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  updatePassword,
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
import PageContainer from "./Container";

// MUI theming
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [newPassword, setNewPassword] = useState(false);
  const [newResetPassword, setNewResetPassword] = useState("");
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

  // user reset password
  async function handleResetPassword(username) {
    try {
      const output = await resetPassword({ username });
      handleResetPasswordNextSteps(output);
      console.log("username", username);
    } catch (error) {
      console.log(error);
      setError(error.message);
      setMessage("");
    }
  }

  function handleResetPasswordNextSteps(output) {
    const { nextStep } = output;
    switch (nextStep.resetPasswordStep) {
      case "CONFIRM_RESET_PASSWORD_WITH_CODE":
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

  async function handleConfirmResetPassword({
    username,
    confirmationCode,
    newResetPassword,
  }) {
    try {
      await confirmResetPassword({
        username,
        confirmationCode,
        newResetPassword,
      });
      console.log("username", username);
      setMessage("Password successfully reset.");
      setStep("done");
      setError("");
    } catch (error) {
      console.log(error);
      console.log(username);
      console.log(confirmationCode);
      setError(error.message);
    }
  }

  async function handleUpdatePassword(oldPassword, newPassword) {
    try {
      await updatePassword({ oldPassword, newPassword });
    } catch (err) {
      console.log(err);
      setError(error.message);
    }
  }

  //TODO: STORE USER INFO IN DATABASE
  // const storeUser = async (first_name, last_name, email, role) => {
  //   setLoading(true);

  //   //sign in user
  //   try {
  //     const user = await signIn({
  //       username: username,
  //       password: password,
  //     });
  //     console.log("User logged in:", user.isSignedIn, user.nextStep.signInStep);
  //   } catch (error) {
  //     console.log("Error getting user:", error);
  //     setLoading(false);
  //     return;
  //   }
  // };

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
            !signUpConfirmation &&
            !forgotPassword && (
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
                      value={username}
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
                      value={password}
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
                        value={firstName}
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
                        value={lastName}
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
                        value={username}
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
                        value={password}
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
            <Box
              sx={{
                my: 10,
                mx: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <Typography variant="h5">Reset Password</Typography>
              {step === "requestReset" && (
                <>
                  <Grid item xs={12} sm={8} md={5} component={Paper} square>
                    <Grid item xs={12}>
                      <TextField
                        label="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        fullWidth
                        margin="normal"
                      />
                    </Grid>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleResetPassword(username)}
                      sx={{ mt: 2 }}
                    >
                      Send Reset Code
                    </Button>
                  </Grid>
                </>
              )}
              {step === "confirmReset" && (
                <Grid item xs={12} sm={8} md={5} component={Paper} square>
                  <Box
                    component="form"
                    noValidate
                    onSubmit={handleConfirmResetPassword}
                    sx={{ mt: 1 }}
                  >
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
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Confirmation Code"
                        value={confirmationCode}
                        onChange={(e) => setConfirmationCode(e.target.value)}
                        fullWidth
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="New Password"
                        type="password"
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                        fullWidth
                        margin="normal"
                      />
                    </Grid>
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      color="primary"
                      sx={{ mt: 3, mb: 2 }}
                    >
                      Reset Password
                    </Button>
                  </Box>
                </Grid>
              )}
              {step === "done" && (
                <Typography color="primary" sx={{ mt: 2 }}>
                  Password has been successfully reset.
                </Typography>
              )}
              {error && (
                <Typography color="error" sx={{ mt: 2 }}>
                  {error}
                </Typography>
              )}
              {message && (
                <Typography color="primary" sx={{ mt: 2 }}>
                  {message}
                </Typography>
              )}
            </Box>
          )}
        </Grid>
      </PageContainer>
    </ThemeProvider>
  );
};

export default Login;
