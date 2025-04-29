import "./App.css";
// amplify
import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { CookieStorage } from "aws-amplify/utils";
import "@aws-amplify/ui-react/styles.css";
// react-router
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useEffect, useState, createContext } from "react";
// pages
import Login from "./pages/Login";
import StudentHomepage from "./pages/student/StudentHomepage";
import StudentChat from "./pages/student/StudentChat";
import AdminHomepage from "./pages/admin/AdminHomepage";
import InstructorHomepage from "./pages/instructor/InstructorHomepage";
import CourseView from "./pages/student/CourseView";
import { NotificationProvider } from "./context/NotificationContext";

export const UserContext = createContext();

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
  const [course, setCourse] = useState(null);
  const [module, setModule] = useState(null);
  const [isInstructorAsStudent, setIsInstructorAsStudent] = useState(false);

  useEffect(() => {
    const fetchAuthData = () => {
      fetchAuthSession()
        .then(({ tokens }) => {
          if (tokens && tokens.accessToken) {
            const group = tokens.accessToken.payload["cognito:groups"];
            setUser(tokens.accessToken.payload);
            setUserGroup(group || []);
          }
        })
        .catch((error) => {
          console.log(error);
        });
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
      if (isInstructorAsStudent) {
        return <StudentHomepage setCourse={setCourse} />;
      } else {
        return <InstructorHomepage />;
      }
    } else if (userGroup && userGroup.includes("student")) {
      return <StudentHomepage setCourse={setCourse} />;
    } else {
      return <Login />;
    }
  };

  return (
    <NotificationProvider>
      <UserContext.Provider
        value={{ isInstructorAsStudent, setIsInstructorAsStudent }}
      >
        <Router>
          <Routes>
            <Route
              path="/"
              element={user ? <Navigate to="/home" /> : <Login />}
            />
            <Route
              path="/student_chat/*"
              element={
                <StudentChat
                  course={course}
                  module={module}
                  setModule={setModule}
                  setCourse={setCourse}
                />
              }
            />
            <Route
              path="/student_course/*"
              element={
                <CourseView
                  course={course}
                  setModule={setModule}
                  setCourse={setCourse}
                />
              }
            />
            <Route path="/home/*" element={getHomePage()} />
            <Route path="/course/*" element={<InstructorHomepage />} />
          </Routes>
        </Router>
      </UserContext.Provider>
    </NotificationProvider>
  );
}

export default App;
