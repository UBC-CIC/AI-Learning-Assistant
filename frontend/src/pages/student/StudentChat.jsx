import React, { useEffect, useRef, useState } from "react";
import AIMessage from "../../components/AIMessage";
import Session from "../../components/Session";
import StudentMessage from "../../components/StudentMessage";
import { fetchAuthSession } from "aws-amplify/auth";
import { getCurrentUser } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";

const StudentChat = ({ course, module, setModule }) => {
  const textareaRef = useRef(null);
  const [sessions, setSessions] = useState([]);
  const [messages, StudentMessages] = useState([]);

  const navigate = useNavigate();
  useEffect(() => {
    const fetchModule = async () => {
      try {
        const session = await fetchAuthSession();
        const { signInDetails } = await getCurrentUser();
        const token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }student/module?email=${encodeURIComponent(
            signInDetails.loginId
          )}&course_id=${encodeURIComponent()}`,
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
          console.log("Instructors data:", data);
        } else {
          console.error("Failed to fetch instructors:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching instructors:", error);
      }
    };

    fetchModule();
  }, []);

  const handleKeyDown = (event) => {
    const textarea = textareaRef.current;
    if (event.key === "Enter") {
      if (event.shiftKey) {
        // Allow new line if Shift+Enter is pressed
        return;
      }
      console.log("Textarea content:", textarea.value);
      event.preventDefault(); // Prevent the default behavior of adding a new line
      handleSubmit(); // Call your function here
    }
  };

  const handleSubmit = () => {
    // Your function to handle Enter key press
    console.log("Enter key pressed");
    // Add your submit logic here
  };
  const handleBack = () => {
    sessionStorage.removeItem("module");
    navigate(-1);
  };

  const handleNewChat = () => {
    console.log("hello");
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
  }, []);

  useEffect(() => {
    const storedModule = sessionStorage.getItem("module");
    if (storedModule) {
      setModule(JSON.parse(storedModule));
    }
  }, [setModule]);

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
            handleNewChat();
          }}
          className="border border-black ml-8 mr-8 mt-0 mb-0 bg-transparent pt-1.5 pb-1.5"
        >
          <div className="flex flex-row gap-6">
            <div className="text-md font-roboto">+</div>
            <div className="text-md font-roboto font-bold">New Chat</div>
          </div>
        </button>
        <div className="my-4">
          <hr className="border-t border-black" />
        </div>
        <div className="font-roboto font-bold ml-8 text-start">History</div>
        <div className=" overflow-y-auto mt-2 mb-6">
          <Session text={"Composite Pattern"} />
          <Session text={"Observer Pattern"} />
          <Session text={"Quiz Question Assistance"} />
          <Session text={"Student Query Summary"} />
          <Session text={"Composite Pattern"} />
          <Session text={"Observer Pattern"} />
          <Session text={"Quiz Question Assistance"} />
          <Session text={"Student Query Summary"} />
          <Session text={"Composite Pattern"} />
          <Session text={"Observer Pattern"} />
          <Session text={"Quiz Question Assistance"} />
          <Session text={"Student Query Summary"} />
        </div>
      </div>
      <div className="flex flex-col-reverse w-3/4 bg-[#F8F9FD]">
        <div className="flex items-center justify-between border bg-[#f2f0f0] border-[#8C8C8C] py-2 mb-12 mx-20">
          <textarea
            ref={textareaRef}
            className="text-sm w-full outline-none bg-[#f2f0f0] text-black resize-none max-h-32 ml-2 mr-2"
            style={{ maxHeight: "8rem" }} // Adjust max height as needed
          />
          <img className="w-3 h-3 mr-4" src="./send.png" alt="send" />
        </div>
        <div className="flex-grow overflow-y-auto p-4 h-full">
          <AIMessage
            message={
              "Hi! Ask me a question, or select one of the options below."
            }
          />
          <StudentMessage
            message={"Please explain to me how the composite pattern works."}
          />
          <AIMessage
            message={
              "Hi! Ask me a question, or select one of the options below."
            }
          />
          <StudentMessage
            message={"Please explain to me how the composite pattern works."}
          />
          <AIMessage
            message={
              "Hi! Ask me a question, or select one of the options below."
            }
          />
          <StudentMessage
            message={"Please explain to me how the composite pattern works."}
          />
          <AIMessage
            message={
              "Hi! Ask me a question, or select one of the options below."
            }
          />
          <StudentMessage
            message={"Please explain to me how the composite pattern works."}
          />
          <AIMessage
            message={
              "Hi! Ask me a question, or select one of the options below."
            }
          />
          <StudentMessage
            message={"Please explain to me how the composite pattern works."}
          />
          <AIMessage
            message={
              "Hi! Ask me a question, or select one of the options below."
            }
          />
          <StudentMessage
            message={"Please explain to me how the composite pattern works."}
          />

          {/* Add more messages here */}
        </div>
        <div className="font-roboto font-bold text-2xl text-left mt-6 ml-12 mb-6 text-black">
          AI Assistant 🌟
        </div>
      </div>
    </div>
  );
};

export default StudentChat;
