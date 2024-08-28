import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { fetchAuthSession } from "aws-amplify/auth";
const Session = ({
  text,
  session,
  setSession,
  deleteSession,
  selectedSession,
  setMessages,
  setSessions,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newSessionName, setNewSessionName] = useState(text);

  const inputRef = useRef(null);
  const sessionRef = useRef(null);

  // Handle clicks outside the session component
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sessionRef.current && !sessionRef.current.contains(event.target)) {
        handleInputBlur(); // Save changes when clicking outside
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault(); // Prevent default Enter key behavior
        handleInputBlur(); // Save changes when Enter is pressed
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [newSessionName]);

  const isSelected =
    selectedSession && selectedSession.session_id === session.session_id;

  const handleSessionClick = () => {
    // Check if the current session is different from the selected session
    if (selectedSession && selectedSession.session_id !== session.session_id) {
      setMessages([]); // Clear messages if sessions are different
    }
    setSession(session); // Update the selected session
  };

  const handleDeleteClick = (event) => {
    event.stopPropagation(); // Prevents the event from bubbling up
    deleteSession(session);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleInputChange = (event) => {
    const inputValue = event.target.value;
    if (inputValue.length <= 20) {
      setNewSessionName(inputValue);
    }
  };

  const handleInputBlur = async () => {
    setIsEditing(false);
    if (newSessionName !== text) {
      // Update the session name in the parent component or backend
      try {
        // Assuming you have a method to update session name
        await updateSessionName(session.session_id, newSessionName);
      } catch (error) {
        console.error("Failed to update session name:", error);
      }
    }
  };

  const updateSessionName = async (sessionId, newName) => {
    const updatedName = newName.trim() === "" ? "New Chat" : newName;

    setSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.session_id === sessionId
          ? { ...session, session_name: updatedName }
          : session
      )
    );

    try {
      const authSession = await fetchAuthSession();
      const token = authSession.tokens.idToken.toString();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }student/update_session_name?session_id=${encodeURIComponent(
          sessionId
        )}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_name: updatedName }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to update session name");
      }
    } catch (error) {
      console.error("Error updating session name:", error);
    }
  };

  return (
    <div
      onClick={handleSessionClick}
      style={{
        background: isSelected
          ? "linear-gradient(90deg, rgb(96.471% 43.137% 100%) 0%, rgb(88.825% 40.478% 98.243%) 6.25%, rgb(81.673% 37.99% 96.599%) 12.5%, rgb(75.014% 35.674% 95.069%) 18.75%, rgb(68.848% 33.529% 93.652%) 25%, rgb(63.176% 31.556% 92.348%) 31.25%, rgb(57.996% 29.755% 91.158%) 37.5%, rgb(53.31% 28.125% 90.081%) 43.75%, rgb(49.118% 26.667% 89.118%) 50%, rgb(45.418% 25.38% 88.267%) 56.25%, rgb(42.212% 24.265% 87.531%) 62.5%, rgb(39.499% 23.321% 86.907%) 68.75%, rgb(37.279% 22.549% 86.397%) 75%, rgb(35.553% 21.949% 86%) 81.25%, rgb(34.32% 21.52% 85.717%) 87.5%, rgb(33.58% 21.262% 85.547%) 93.75%, rgb(33.333% 21.176% 85.49%) 100%)"
          : "#5536DA",
      }}
      className="cursor-pointer rounded flex flex-row justify-between items-center my-2 mx-8 py-2 px-4"
    >
      <div
        onDoubleClick={handleDoubleClick}
        className="flex flex-row items-center justify-start gap-6"
      >
        <img src="/message.png" alt="message" className="w-2 h-2" />
        {isEditing ? (
          <input
            type="text"
            value={newSessionName}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            autoFocus
            className="text-[#e8e8e8] font-light font-inter text-xs bg-transparent border-none outline-none"
          />
        ) : (
          <div className="text-[#e8e8e8] font-light font-inter text-xs">
            {text}
          </div>
        )}
      </div>
      <div
        onClick={handleDeleteClick}
        className="cursor-pointer w-3 h-3 flex items-center justify-center ml-2"
        style={{ marginLeft: "8px" }} // Adds margin around the delete button
      >
        <img src="/delete.png" alt="delete" className="w-3 h-3" />
      </div>
    </div>
  );
};

Session.propTypes = {
  text: PropTypes.string.isRequired,
  session: PropTypes.object.isRequired,
  setSession: PropTypes.func.isRequired,
  deleteSession: PropTypes.func.isRequired,
  selectedSession: PropTypes.object,
  setMessages: PropTypes.func.isRequired,
};

export default Session;
