import "./App.css";
// amplify
import { Amplify } from "aws-amplify";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import "@aws-amplify/ui-react/styles.css";
// react-router
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import React, { useEffect, useState, createContext } from "react";
// pages
import Login from "./pages/Login";
import StudentHomepage from "./pages/student/StudentHomepage";
import StudentChat from "./pages/student/StudentChat";
import AdminHomepage from "./pages/admin/AdminHomepage";
import InstructorHomepage from "./pages/instructor/InstructorHomepage";
// functions
import { useAuthentication } from "./functions/useAuth";

export const AuthContext = createContext("user");

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

function App() {
  const [user, setUser] = useState(null);
  const [userGroup, setUserGroup] = useState(null);
  const [userInfo, setUserInfo] = useState({});

  const { authuser, credentials } = useAuthentication();
  console.log("test useAuth credentials", credentials);
  console.log("test useAuth user", authuser);
  //get user info and render page based on role

  // useEffect(() => {
  //   async function getUserInfo(email) {
  //     try {
  //       const userInformation = await getUser(email);
  //       setUserInfo(userInformation);
  //       console.log("user info", userInformation);
  //     } catch (error) {
  //       console.log("Error getting user:", error);
  //     }
  //   }

  //   async function getCognitoUser() {
  //     try {
  //       const currentUser = await getCurrentUser();
  //       setUser(currentUser);
  //       console.log(currentUser.signInDetails.loginId, "is signed in");
  //       getUserInfo(currentUser.signInDetails.loginId);
  //       <Navigate to="/home" />;
  //     } catch (error) {
  //       setUser(null);
  //       console.log("Error getting user:", error);
  //       <Navigate to="/" />;
  //     }
  //   }

  //   getCognitoUser();
  // }, []);

  useEffect(() => {
    const fetchAuthData = async () => {
      try {
        const { tokens } = await fetchAuthSession();
        if (tokens && tokens.accessToken) {
          const group = tokens.accessToken.payload["cognito:groups"];
          setUser(tokens.accessToken.payload);
          setUserGroup(group || []);
          console.log("User belongs to following groups: " + group);
          // console.log("user", user);
          console.log(userGroup);
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchAuthData();
  }, []);

  const getHomePage = () => {
    if (
      userGroup &&
      (userGroup.includes("admin") || userGroup.includes("techadmin"))
    ) {
      return <AdminHomepage />;
    } else if (userGroup && userGroup.includes("instructor")) {
      return <InstructorHomepage />;
    } else if (userGroup && userGroup.includes("student")) {
      return <StudentHomepage />;
    } else {
      return <Login />;
    }
  };

  return (
    <Router>
        <AuthContext.Provider value={{ authuser, credentials }}>
          <Routes>
            <Route
              path="/"
              element={user ? <Navigate to="/home" /> : <Login />}
            />
            <Route path="/chat" element={<StudentChat />} />
            <Route path="/home" element={getHomePage()} />
          </Routes>
        </AuthContext.Provider>
    </Router>
  );
}

export default App;
