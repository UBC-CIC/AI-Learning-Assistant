import React from "react";
import { useNavigate } from "react-router-dom";
// MUI
import SettingsIcon from "@mui/icons-material/Settings";
// amplify
import { signOut } from "aws-amplify/auth";

const AdminHeader = () => {
  const navigate = useNavigate();
  const handleSignOut = (event) => {
    event.preventDefault();
    signOut()
      .then(() => {
        window.location.href = "/";
        // navigate("/"); // Redirect to the login page
      })
      .catch((error) => {
        console.error("Error signing out: ", error);
      });
  };

  return (
    <header className="bg-[#F8F9FD] p-4 flex justify-between items-center max-h-20">
      <div className="text-black text-3xl font-semibold p-4">Administrator</div>
      {/* <button className="text-black bg-transparent">
        <SettingsIcon size={35} />
      </button> */}
      <button
        type="button"
        className="bg-gray-800 text-white hover:bg-gray-700"
        onClick={handleSignOut}
      >
        Sign Out
      </button>
    </header>
  );
};

export default AdminHeader;
