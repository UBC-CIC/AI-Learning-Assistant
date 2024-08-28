import React, { useEffect, useRef, useState } from "react";
import AIMessage from "../../components/AIMessage";
import Session from "../../components/Session";
import StudentMessage from "../../components/StudentMessage";
import { fetchAuthSession } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";
import { fetchUserAttributes } from 'aws-amplify/auth';

const StudentChat = ({ course, module, setModule, setCourse }) => {
  const textareaRef = useRef(null);
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);


  async function retrieveKnowledgeBase(message) {
    try {
      const authSession = await fetchAuthSession();
      const {email} = await fetchUserAttributes();
      const token = authSession.tokens.idToken.toString();
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }student/create_ai_message?session_id=${encodeURIComponent(
            session.session_id
          )}&email=${encodeURIComponent(
            email
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
              message_content: message.message,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
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
    let new_session;
    if (!session) {
      new_session = await handleNewChat();
    } else {
      new_session = session;
    }
    const messageContent = textareaRef.current.value.trim();
    if (!messageContent) {
      console.warn("Message content is empty or contains only spaces.");
      return;
    }
    const authSession = await fetchAuthSession();
    const {email} = await fetchUserAttributes();
    const token = authSession.tokens.idToken.toString();
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }student/create_message?session_id=${encodeURIComponent(
          new_session.session_id
        )}&email=${encodeURIComponent(
          email
        )}&course_id=${encodeURIComponent(
          course.course_id
        )}&module_id=${encodeURIComponent(module.module_id)}`, // change to name
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
          retrieveKnowledgeBase(data);
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

  const navigate = useNavigate();

  useEffect(() => {
    const fetchModule = async () => {
      if (!course || !module) {
        console.log("Course or module not defined");
        return; // Exit early if course or module are not defined
      }

      try {
        const session = await fetchAuthSession();
        const {email} = await fetchUserAttributes();
        const token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }student/module?email=${encodeURIComponent(
            email
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
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(); // Call the handleSubmit function when Enter is pressed
    }
  };

  const handleBack = () => {
    sessionStorage.removeItem("module");
    navigate(-1);
  };

  const handleNewChat = async () => {
    try {
      const session = await fetchAuthSession();
      const {email} = await fetchUserAttributes();
      const token = session.tokens.idToken.toString();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }student/create_session?email=${encodeURIComponent(
          email
        )}&course_id=${encodeURIComponent(
          course.course_id
        )}&module_id=${encodeURIComponent(
          module.module_id
        )}&session_name=${encodeURIComponent("New chat")}`,
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
        setSession(data[0]);
        return data[0];
      } else {
        console.error("Failed to create session:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching creating new chat:", error);
    }
  };

  const handleDeleteSession = async (sessionDelete) => {
    try {
      const authSession = await fetchAuthSession();
      const {email} = await fetchUserAttributes();
      const token = authSession.tokens.idToken.toString();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }student/delete_session?email=${encodeURIComponent(
          email
        )}&course_id=${encodeURIComponent(
          course.course_id
        )}&module_id=${encodeURIComponent(
          module.module_id
        )}&session_id=${encodeURIComponent(sessionDelete.session_id)}`,
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
            (isession) => isession.session_id !== sessionDelete.session_id
          )
        );
        setSession(null);
        setMessages([]);
      } else {
        console.error("Failed to create session:", response.statusText);
      }
    } catch (error) {
      console.error("Error creating session:", error);
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
  }, [textareaRef.currrent, handleKeyDown]);
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

  const getMessages = async () => {
    try {
      const authSession = await fetchAuthSession();
      const {email} = await fetchUserAttributes();
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
  useEffect(() => {
    if (session) {
      getMessages();
    }
  }, [session]);

  if (!module) {
    return <div>Loading...</div>; // Or any placeholder UI
  }

  return (
    <div className="flex flex-row h-screen">
      <div className="flex flex-col w-1/4 bg-gradient-to-tr from-purple-300 to-cyan-100">
        <div className="flex flex-row mt-3 mb-3 ml-4">
          <img
            onClick={() => handleBack()}
            className="w-8 h-8 cursor-pointer"
            src="./ArrowCircleDownRounded.png"
            alt="back"
          />
          <div className="ml-3 pt-0.5 text-black font-roboto font-bold text-lg">
            {module.module_name}
          </div>
        </div>
        <button
          onClick={() => {
            handleNewChat();
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
                setMessages={setMessages}
                setSessions={setSessions}
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
            maxLength={2096}
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
    </div>
  );
};

export default StudentChat;
