import "./App.css";
// amplify
import { Amplify } from "aws-amplify";
import { getCurrentUser } from "aws-amplify/auth";
import "@aws-amplify/ui-react/styles.css";
// react-router
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import React, { useEffect, useState } from "react";
// pages
import Login from "./pages/login";
import StudentHomepage from "./pages/studentHomepage";

Amplify.configure({
  API: {
    REST: {
      MyApi: {
        endpoint: import.meta.env.VITE_API_ENDPOINT,
      },
    },
  },
  Auth: {
    Cognito: {
      region: import.meta.env.VITE_AWS_REGION,
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      allowGuestAccess: false,
    },
  },
});

console.log("config:", Amplify.getConfig());

function App() {
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState({});
  //get user info and render page based on role

  useEffect(() => {
    async function getUserInfo(email) {
      try {
        const userInformation = await getUser(email);
        setUserInfo(userInformation);
        console.log("user email", userInformation);
      } catch (error) {
        console.log("Error getting user:", error);
      }
    }

    async function getCognitoUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        console.log(currentUser.signInDetails.loginId, "is signed in");
        getUserInfo(currentUser.signInDetails.loginId);
        <Navigate to="/home" />;
      } catch (error) {
        setUser(null);
        console.log("Error getting user:", error);
        <Navigate to="/" />;
      }
    }

    getCognitoUser();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" /> : <Login />} />
        <Route path="/home" element={<StudentHomepage />} />
      </Routes>
    </Router>
  );
}

export default App;
