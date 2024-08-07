import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// MUI
import SettingsIcon from "@mui/icons-material/Settings";
// amplify
import { signOut } from "aws-amplify/auth";
import { fetchAuthSession } from 'aws-amplify/auth';
import { getCurrentUser } from 'aws-amplify/auth';


const StudentHeader = () => {
  const [name, setName] = useState('')
  const navigate = useNavigate();

  useEffect(() => {
    const fetchName = async () => {
      try {
        const session = await fetchAuthSession();
        const {signInDetails } = await getCurrentUser();
        var token = session.tokens.idToken.toString()
        const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}student/get_name?user_email=${encodeURIComponent(signInDetails.loginId)}`, {
          method: 'GET',
          headers: {
              'Authorization': token,
              'Content-Type': 'application/json'
          }
      });
        if (response.ok) {
          const data = await response.json();
          setName(data.name)
        } else {
          console.error('Failed to fetch name:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching name:', error);
      }
    };

    fetchName();
  }, []);

  const handleSignOut = async (event) => {
    event.preventDefault();
    try {
      await signOut();
      window.location.href = "/";
      // navigate("/"); // Redirect to the login page
    } catch (error) {
      console.error("Error signing out: ", error);
    }
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
        variant="contained"
        color="secondary"
        onClick={handleSignOut}
        sx={{
          bgcolor: "purple",
          color: "white",
          ":hover": { bgcolor: "darkpurple" },
        }}
      >
        Sign Out
      </button>
    </header>
  );
};

export default StudentHeader;
