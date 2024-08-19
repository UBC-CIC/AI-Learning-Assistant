import "./App.css";
// amplify
import { Amplify } from "aws-amplify";
import { getCurrentUser, fetchAuthSession, decodeJWT } from "aws-amplify/auth";
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
import CourseView from "./pages/student/CourseView";

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
  const [course, setCourse] = useState(null);
  const [module, setModule] = useState(null);

  useEffect(() => {
    const fetchAuthData = async () => {
      try {
        const { tokens } = await fetchAuthSession();
        if (tokens && tokens.accessToken) {
          const group = tokens.accessToken.payload["cognito:groups"];
          setUser(tokens.accessToken.payload);
          setUserGroup(group || []);
          console.log(
            "auth token payload",
            tokens.accessToken.payload["cognito:groups"]
          );
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
      return <StudentHomepage setCourse={setCourse} />;
    } else {
      return <Login />;
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" /> : <Login />} />
        <Route path="/student_chat/*" element={<StudentChat course = {course} module = {module} setModule={setModule} setCourse = {setCourse}/>} />
        <Route path="/student_course/*" element={<CourseView course = {course} setModule = {setModule} setCourse = {setCourse}/>} />
        <Route path="/home" element={getHomePage()} />
        <Route path="/course/*" element={<InstructorHomepage />} />
      </Routes>
    </Router>
  );
}

export default App;
