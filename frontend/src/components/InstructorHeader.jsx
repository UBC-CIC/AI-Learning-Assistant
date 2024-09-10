import React from "react";
import { useNavigate } from "react-router-dom";
// amplify
import { signOut } from "aws-amplify/auth";

const InstructorHeader = () => {
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
      <div className="text-black text-3xl font-semibold p-4">Instructor </div>
      <button
        type="button"
        className="bg-black text-white hover:bg-slate-700"
        onClick={handleSignOut}
      >
        Sign Out
      </button>
    </header>
  );
};

export default InstructorHeader;
