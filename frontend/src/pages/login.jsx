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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newUserPassword, setNewUserPassword] = useState(false);
  const [newSignUp, setNewSignUp] = useState(false);
  const [signUpConfirmation, setSignUpConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  //TODO: SET MORE ERRORS
  const [passwordError, setPasswordError] = useState("");
  const [confirmationError, setConfirmationError] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false); //TODO: FORGOT PASSWORD FUNCTIONALITY

  const handleLogin = async (event) => {
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

  const handleNewPasswordUser = async (event) => {
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

  const handleSignUp = async (event) => {
    event.preventDefault();
    const confirmPassword = event.target.confirmPassword.value;

    // TODO: ACCOUNT FOR MORE PASSWORD SPECIFICATIONS
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match!");
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

  return (
    <div className="flex w-full rounded-lg mx-auto shadow-lg overflow-hidden bg-gray-100">
      <div className="w-3/5 flex flex-col items-center justify-center overflow-auto scrollbar-thin scrollbar-webkit">
        {loading && (
          <div className="block text-m mb-1 mt-6 text-zinc-600">Loading...</div>
        )}
        {!loading && !newUserPassword && !newSignUp && !signUpConfirmation && (
          <div>
            <div>
              <h1 className="text-4xl font-bold my-3 text-zinc-600">
                Sign in to manage your CV
              </h1>
              <p>
                Sign in below or{" "}
                <span
                  className="text-zinc-600 font-bold underline underline-offset-2 cursor-pointer"
                  onClick={() => setNewSignUp(true)}
                >
                  create an account
                </span>
              </p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <form onSubmit={handleLogin}>
                <label className="block text-m mb-1 mt-6">Email</label>
                <input
                  className="input input-bordered w-full text-sm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Email"
                  required
                />
                <label className="block text-m mb-1 mt-6">Password</label>
                <input
                  className="input input-bordered w-full text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  type="password"
                  required
                />
                <button
                  className="btn btn-neutral mt-6 mb-3 w-full text-base"
                  type="submit"
                >
                  Sign In
                </button>
              </form>
              <span
                className="text-zinc-600 text-sm font-bold underline underline-offset-2 cursor-pointer"
                onClick={() => setForgotPassword(true)}
              >
                Forgot Password
              </span>
            </div>
          </div>
        )}
        {!loading && newSignUp && (
          <div className="mt-20 mb-5">
            <div>
              <h1 className="text-3xl font-bold my-3 text-zinc-600">
                Create an account
              </h1>
              <p className="text-sm">
                Enter your account details below or{" "}
                <span
                  className="text-zinc-600 font-bold underline underline-offset-2 cursor-pointer"
                  onClick={() => setNewSignUp(false)}
                >
                  sign in
                </span>
              </p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <form onSubmit={handleSignUp}>
                <label className="block text-xs mt-4">First Name</label>
                <input
                  className="input input-bordered mt-1 h-10 w-full text-xs"
                  name="firstName"
                  placeholder="First Name"
                  required
                />
                <label className="block text-xs mt-4">Last Name</label>
                <input
                  className="input input-bordered mt-1 h-10 w-full text-xs"
                  name="lastName"
                  placeholder="Last Name"
                  required
                />
                <label className="block text-xs mt-4">Email</label>
                <input
                  className="input input-bordered mt-1 h-10 w-full text-xs"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Email"
                  required
                />
                <label className="block text-xs mt-4">Password</label>
                <input
                  className="input input-bordered mt-1 h-10 w-full text-xs"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  type="password"
                  required
                />
                <label className="block text-xs mt-4">Confirm Password</label>
                <input
                  className="input input-bordered mt-1 h-10 w-full text-xs"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  type="password"
                  required
                />
                <div className="mt-2 flex justify-between">
                  <div className="mt-2">
                    <input
                      type="radio"
                      id="faculty"
                      name="role"
                      value="Faculty"
                      defaultChecked
                    />
                    <label className="ml-1 text-xs">Faculty</label>
                  </div>
                  <div className="mt-2">
                    <input
                      type="radio"
                      id="assistant"
                      name="role"
                      value="Assistant"
                    />
                    <label className="ml-1 text-xs">Assistant</label>
                  </div>
                </div>

                {passwordError && (
                  <div className="block text-m mb-1 mt-6 text-red-600">
                    {passwordError}
                  </div>
                )}
                <button
                  className="btn btn-neutral mt-4 min-h-5 h-8 w-full"
                  type="submit"
                >
                  Create Account
                </button>
              </form>
            </div>
          </div>
        )}
        {!loading && newUserPassword && (
          <form onSubmit={handleNewPasswordUser}>
            <input
              name="newPassword"
              placeholder="New Password"
              type="password"
              required
            />
            <input
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
            <button type="submit">Submit New Password</button>
          </form>
        )}
        {!loading && signUpConfirmation && (
          <div>
            <p>
              Account not confirmed. Please enter the confirmation code sent to
              your email.
            </p>
            <form onSubmit={handleConfirmSignUp}>
              <input
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
              <button type="submit">Submit</button>
              <button type="button" onClick={resendConfirmationCode}>
                Resend Code
              </button>
            </form>
          </div>
        )}
      </div>
      <div
        className="w-2/5"
        style={{
          backgroundImage: "url(/UBC.jpg)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      ></div>
    </div>
  );
}

export default Login;
