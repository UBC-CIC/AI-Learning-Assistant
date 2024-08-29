import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// MUI
import SettingsIcon from "@mui/icons-material/Settings";
// amplify
import { signOut } from "aws-amplify/auth";
import { fetchAuthSession } from "aws-amplify/auth";
import { fetchUserAttributes } from "aws-amplify/auth";

const StudentHeader = () => {
  const [name, setName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchName = () => {
      fetchAuthSession()
        .then((session) => {
          return fetchUserAttributes().then((userAttributes) => {
            const token = session.tokens.idToken.toString();
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
        .then((response) => {
          return response.json();
        })
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

  return (
    <header className="bg-[#F8F9FD] p-4 flex justify-between items-center max-h-20">
      <div className="text-black text-3xl font-roboto font-semibold p-4">
        Hi {name}!👋
      </div>
      {/* <button className="text-black bg-transparent">
        <SettingsIcon size={35} />
      </button> */}
      <button
        className="bg-gray-800 text-white hover:bg-gray-700"
        onClick={handleSignOut}
      >
        Sign Out
      </button>
    </header>
  );
};

export default StudentHeader;
