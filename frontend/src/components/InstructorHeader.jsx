import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
// amplify
import { signOut } from "aws-amplify/auth";
import { UserContext } from "../App";

const InstructorHeader = () => {
  const navigate = useNavigate();
  const { setIsInstructorAsStudent } = useContext(UserContext);

  const handleSignOut = (event) => {
    event.preventDefault();
    signOut()
      .then(() => {
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Error signing out: ", error);
      });
  };

  // This will set the context value to true (i.e., switch to "Instructor as Student" mode)
  const handleViewAsStudent = () => {
    setIsInstructorAsStudent(true);
  };

  return (
    <header className="bg-[#F8F9FD] p-4 flex justify-between items-center max-h-20">
      <div className="text-black text-3xl font-semibold p-4">Instructor</div>
      <div className="flex items-center space-x-4">
        <button
          type="button"
          className="bg-[#5536DA] text-white px-4 py-2 rounded hover:bg-violet-700"
          onClick={handleViewAsStudent} // Set context state to true
        >
          Student View
        </button>
        <button
          type="button"
          className="bg-gray-800 text-white hover:bg-gray-700 px-4 py-2 rounded"
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
};

export default InstructorHeader;
