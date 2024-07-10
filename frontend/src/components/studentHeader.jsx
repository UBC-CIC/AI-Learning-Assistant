import React from "react";
import { useNavigate } from "react-router-dom";
// MUI
import SettingsIcon from "@mui/icons-material/Settings";
// amplify
import { signOut } from "aws-amplify/auth";

const StudentHeader = () => {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/"); // Redirect to the login page
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <header className="bg-[#F8F9FD] p-4 flex justify-between items-center">
      <div className="text-black text-3xl font-semibold p-4">Hi User!👋</div>
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
