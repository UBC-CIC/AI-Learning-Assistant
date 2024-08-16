import React, { useCallback, useEffect, useRef, useState } from "react";
import AIMessage from "../../components/AIMessage";
import Session from "../../components/Session";
import StudentMessage from "../../components/StudentMessage";
import { fetchAuthSession } from "aws-amplify/auth";
import { getCurrentUser } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

const StudentChat = ({ course, module, setModule, setCourse }) => {
  const textareaRef = useRef(null);
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = React.useState(false);

  async function retrieveKnowledgeBase(message) {
    try {
      const authSession = await fetchAuthSession();
      const { signInDetails } = await getCurrentUser();
      const token = authSession.tokens.idToken.toString();
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }student/create_ai_message?session_id=${encodeURIComponent(
            session.session_id
          )}&email=${encodeURIComponent(
            signInDetails.loginId
          )}&course_id=${encodeURIComponent(
            course.course_id
          )}&module_id=${encodeURIComponent(module.module_id)}`,
          {
            method: "POST",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message_content: message.message
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("Message created:", data);
          setMessages((prevItems) => [...prevItems, data[0]]);
        } else {
          console.error("Failed to retreive message:", response.statusText);
        }
      } catch (error) {
        console.error("Error retreiving message:", error);
      }
    } catch (error) {
      console.error("Error retrieving message from knowledge base:", error);
    }
  }

  const handleSubmit = async () => {
    if (!session) {
      console.error("Session is not set. Cannot submit the message.");
      return;
    }
    console.log(textareaRef.current.value);
    console.log("Enter key pressed");

    const messageContent = textareaRef.current.value;
    const authSession = await fetchAuthSession();
    const { signInDetails } = await getCurrentUser();
    const token = authSession.tokens.idToken.toString();
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }student/create_message?session_id=${encodeURIComponent(
          session.session_id
        )}&email=${encodeURIComponent(
          signInDetails.loginId
        )}&course_id=${encodeURIComponent(
          course.course_id
        )}&module_id=${encodeURIComponent(module.module_id)}`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message_content: messageContent,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Message created:", data);
        setMessages((prevItems) => [...prevItems, data[0]]);
        textareaRef.current.value = "";

        const message = data[0].message_content;

        try {
          const response = await fetch(`http://127.0.0.1:5000/answer`, {
            method: "POST",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message_content: message,
            }),
          });
          const data = await response.json();

          // Log the parsed data
          retrieveKnowledgeBase(data)
        } catch (error) {
          console.error("Error creating flask:", error);
        }
      } else {
        console.error("Failed to create message:", response.statusText);
      }
    } catch (error) {
      console.error("Error creating message:", error);
    }
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const navigate = useNavigate();

  useEffect(() => {
    const fetchModule = async () => {
      if (!course || !module) {
        console.log("Course or module not defined");
        return; // Exit early if course or module are not defined
      }

      try {
        const session = await fetchAuthSession();
        const { signInDetails } = await getCurrentUser();
        const token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }student/module?email=${encodeURIComponent(
            signInDetails.loginId
          )}&course_id=${encodeURIComponent(
            course.course_id
          )}&module_id=${encodeURIComponent(module.module_id)}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setSessions(data);
          setSession(data[data.length - 1]);
        } else {
          console.error("Failed to fetch module:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching module:", error);
      }
    };

    fetchModule();
  }, [course, module]); // Added course and module to dependency array

  const handleKeyDown = (event) => {
    const textarea = textareaRef.current;
    if (event.key === "Enter") {
      if (event.shiftKey) {
        // Allow new line if Shift+Enter is pressed
        return;
      }
      event.preventDefault(); // Prevent the default behavior of adding a new line
      handleSubmit(); // Call your function here
    }
  };

  const handleBack = () => {
    sessionStorage.removeItem("module");
    navigate(-1);
  };

  const handleNewChat = async (session_name) => {
    try {
      const session = await fetchAuthSession();
      const { signInDetails } = await getCurrentUser();
      const token = session.tokens.idToken.toString();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }student/create_session?email=${encodeURIComponent(
          signInDetails.loginId
        )}&course_id=${encodeURIComponent(
          course.course_id
        )}&module_id=${encodeURIComponent(
          module.module_id
        )}&session_name=${encodeURIComponent(session_name)}`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSessions((prevItems) => [...prevItems, data[0]]);
      } else {
        console.error("Failed to create session:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    }
  };

  const handleDeleteSession = async (session) => {
    try {
      const authSession = await fetchAuthSession();
      const { signInDetails } = await getCurrentUser();
      const token = authSession.tokens.idToken.toString();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }student/delete_session?email=${encodeURIComponent(
          signInDetails.loginId
        )}&course_id=${encodeURIComponent(
          course.course_id
        )}&module_id=${encodeURIComponent(
          module.module_id
        )}&session_id=${encodeURIComponent(session.session_id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSessions((prevSessions) =>
          prevSessions.filter(
            (isession) => isession.session_id !== session.session_id
          )
        );
        setMessages([]);
      } else {
        console.error("Failed to create session:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto"; // Reset height to recalculate
        textarea.style.height = `${textarea.scrollHeight}px`; // Set height based on content

        // Enforce max-height and add scroll when needed
        if (textarea.scrollHeight > parseInt(textarea.style.maxHeight)) {
          textarea.style.overflowY = "auto";
        } else {
          textarea.style.overflowY = "hidden";
        }
      }
    };

    handleResize(); // Initial call
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.addEventListener("input", handleResize);

      textarea.addEventListener("keydown", handleKeyDown);
    }

    // Cleanup event listener on unmount
    return () => {
      if (textarea) {
        textarea.removeEventListener("input", handleResize);
        textarea.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [textareaRef]);
  useEffect(() => {
    const storedModule = sessionStorage.getItem("module");
    if (storedModule) {
      setModule(JSON.parse(storedModule));
    }
  }, [setModule]);

  useEffect(() => {
    const storedCourse = sessionStorage.getItem("course");
    if (storedCourse) {
      setCourse(JSON.parse(storedCourse));
    }
  }, [setCourse]);

  useEffect(() => {
    const getMessages = async () => {
      try {
        const authSession = await fetchAuthSession();
        const { signInDetails } = await getCurrentUser();
        const token = authSession.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }student/get_messages?session_id=${encodeURIComponent(
            session.session_id
          )}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        } else {
          console.error("Failed to retreive session:", response.statusText);
          setMessages([]);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        setMessages([]);
        console.log("messages", messages);
      }
    };
    getMessages();
  }, [session]);

  if (!module) {
    return <div>Loading...</div>; // Or any placeholder UI
  }

  return (
    <div className="flex flex-row h-screen">
      <div className="flex flex-col w-1/4 bg-gradient-to-tr from-purple-300 to-cyan-100">
        <div className="mt-3 mb-3 ml-4">
          <img
            onClick={() => handleBack()}
            className="w-8 h-8 cursor-pointer"
            src="./ArrowCircleDownRounded.png"
            alt="back"
          />
        </div>
        <button
          onClick={() => {
            handleClickOpen();
          }}
          className="border border-black ml-8 mr-8 mt-0 mb-0 bg-transparent pt-1.5 pb-1.5"
        >
          <div className="flex flex-row gap-6">
            <div className="text-md font-roboto text-[#212427]">+</div>
            <div className="text-md font-roboto font-bold text-[#212427]">
              New Chat
            </div>
          </div>
        </button>
        <div className="my-4">
          <hr className="border-t border-black" />
        </div>
        <div className="font-roboto font-bold ml-8 text-start text-[#212427]">
          History
        </div>
        <div className=" overflow-y-auto mt-2 mb-6">
          {sessions
            .slice()
            .reverse()
            .map((iSession, index) => (
              <Session
                key={index}
                text={iSession.session_name}
                session={iSession}
                setSession={setSession}
                deleteSession={handleDeleteSession}
                selectedSession={session}
              />
            ))}
        </div>
      </div>
      <div className="flex flex-col-reverse w-3/4 bg-[#F8F9FD]">
        <div className="flex items-center justify-between border bg-[#f2f0f0] border-[#8C8C8C] py-2 mb-12 mx-20">
          <textarea
            ref={textareaRef}
            className="text-sm w-full outline-none bg-[#f2f0f0] text-black resize-none max-h-32 ml-2 mr-2"
            style={{ maxHeight: "8rem" }} // Adjust max height as needed
          />
          <img
            onClick={handleSubmit}
            className="cursor-pointer w-3 h-3 mr-4"
            src="./send.png"
            alt="send"
          />
        </div>
        <div className="flex-grow overflow-y-auto p-4 h-full">
          {messages.map((message) =>
            message.student_sent ? (
              <StudentMessage
                key={message.message_id}
                message={message.message_content}
              />
            ) : (
              <AIMessage
                key={message.message_id}
                message={message.message_content}
              />
            )
          )}
        </div>
        <div className="font-roboto font-bold text-2xl text-left mt-6 ml-12 mb-6 text-black">
          AI Assistant 🌟
        </div>
      </div>
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          component: "form",
          onSubmit: (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries(formData.entries());
            const code = formJson.code;
            handleNewChat(code);
            handleClose();
          },
        }}
      >
        <DialogTitle>New Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please enter the name of your new session.
          </DialogContentText>
          <TextField
            autoFocus
            required
            margin="dense"
            id="name"
            name="code"
            label="Session Name"
            fullWidth
            variant="standard"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit">Create</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default StudentChat;
