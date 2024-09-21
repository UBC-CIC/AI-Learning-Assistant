import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
// MUI
import SettingsIcon from "@mui/icons-material/Settings";
// amplify
import { signOut } from "aws-amplify/auth";
import { fetchAuthSession } from "aws-amplify/auth";
import { fetchUserAttributes } from "aws-amplify/auth";
import { UserContext } from "../App";

const StudentHeader = () => {
  const [name, setName] = useState("");
  const { isInstructorAsStudent, setIsInstructorAsStudent } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchName = () => {
      fetchAuthSession()
        .then((session) => {
          return fetchUserAttributes().then((userAttributes) => {
            const token = session.tokens.idToken
            const email = userAttributes.email;
            return fetch(
              `${
                import.meta.env.VITE_API_ENDPOINT
              }student/get_name?user_email=${encodeURIComponent(email)}`,
              {
                method: "GET",
                headers: {
                  Authorization: token,
                  "Content-Type": "application/json",
                },
              }
            );
          });
        })
        .then((response) => response.json())
        .then((data) => {
          setName(data.name);
        })
        .catch((error) => {
          console.error("Error fetching name:", error);
        });
    };

    fetchName();
  }, []);

  const handleSignOut = async (event) => {
    event.preventDefault();
    signOut()
      .then(() => {
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Error signing out: ", error);
      });
  };

  // Button to switch back to instructor mode
  const handleSwitchToInstructor = () => {
    setIsInstructorAsStudent(false);
  };

  return (
    <header className="bg-[#F8F9FD] p-4 flex justify-between items-center max-h-20">
      <div className="text-black text-3xl font-roboto font-semibold p-4">
        Hi {name}!👋
      </div>
      <div className="flex items-center space-x-4">
        {/* Render this button only if the instructor is viewing as a student */}
        {isInstructorAsStudent && (
          <button
            className="bg-[#5536DA] text-white px-4 py-2 rounded hover:bg-violet-700"
            onClick={handleSwitchToInstructor}
          >
            Instructor view
          </button>
        )}
        <button
          className="bg-gray-800 text-white hover:bg-gray-700 px-4 py-2 rounded"
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
};

export default StudentHeader;
