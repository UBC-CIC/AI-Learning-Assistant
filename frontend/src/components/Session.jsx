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
  sessions,
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
        event.preventDefault();
        handleInputBlur();
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
    if (selectedSession && selectedSession.session_id !== session.session_id) {
      setMessages([]);
    }
    setSession(session);
  };

  const handleDeleteClick = (event) => {
    event.stopPropagation();
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
      updateSessionName(session.session_id, newSessionName).catch((err) => {
        console.error("Failed to update session name:", err);
      });
    }
  };

  const updateSessionName = (sessionId, newName) => {
    const updatedName = newName.trim() === "" ? "New Chat" : newName;

    // Update the sessions state first
    setSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.session_id === sessionId
          ? { ...session, session_name: updatedName }
          : session
      )
    );

    // Return the fetchAuthSession promise
    return fetchAuthSession()
      .then((authSession) => {
        const token = authSession.tokens.idToken.toString();
        // Return the fetch promise
        return fetch(
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
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update session name");
        }
      })
      .catch((error) => {
        console.error("Error updating session name:", error);
      });
  };

  return (
    <div
      onClick={handleSessionClick}
      style={{
        background: isSelected
          ? "linear-gradient(90deg, rgb(0% 45.098% 90.196%) 0%, rgb(2.083% 43.603% 89.902%) 6.25%, rgb(4.167% 42.108% 89.608%) 12.5%, rgb(6.25% 40.613% 89.314%) 18.75%, rgb(8.333% 39.118% 89.02%) 25%, rgb(10.417% 37.623% 88.725%) 31.25%, rgb(12.5% 36.127% 88.431%) 37.5%, rgb(14.583% 34.632% 88.137%) 43.75%, rgb(16.667% 33.137% 87.843%) 50%, rgb(18.75% 31.642% 87.549%) 56.25%, rgb(20.833% 30.147% 87.255%) 62.5%, rgb(22.917% 28.652% 86.961%) 68.75%, rgb(25% 27.157% 86.667%) 75%, rgb(27.083% 25.662% 86.373%) 81.25%, rgb(29.167% 24.167% 86.078%) 87.5%, rgb(31.25% 22.672% 85.784%) 93.75%, rgb(33.333% 21.176% 85.49%) 100% )"
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
        style={{ marginLeft: "8px" }}
      >
        <img src="/delete.png" alt="delete" className="w-3 h-3" />
      </div>
    </div>
  );
};

export default Session;
