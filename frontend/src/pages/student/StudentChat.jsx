import AIMessage from "../../components/AIMessage";
import Session from "../../components/Session";
import StudentMessage from "../../components/StudentMessage";
import { useEffect } from "react";
import { fetchAuthSession } from 'aws-amplify/auth';
const StudentChat = () => {


  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString()
        const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}student/create_user?user_email=a&username=a&first_name=a&last_name=a&preferred_name=a`, {
          method: 'POST',
          headers: {
              'Authorization': token,
              'Content-Type': 'application/json'
          }
      });
        if (response.ok) {
          const data = await response.json();
          console.log('Instructors data:', data);
        } else {
          console.error('Failed to fetch instructors:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching instructors:', error);
      }
    };

    fetchInstructors();
  }, []);
  return (
    <div className="flex flex-row">
      <div className="flex flex-col w-1/4 h-screen bg-gradient-to-tr from-purple-300 to-cyan-100">
        <div className="mt-3 mb-3 ml-4">
          <img
            className="w-8 h-8"
            src="./ArrowCircleDownRounded.png"
            alt="back"
          />
        </div>
        <button className="border border-black ml-8 mr-8 mt-0 mb-0 bg-transparent pt-1.5 pb-1.5">
          <div className="flex flex-row gap-6">
            <div className="text-md font-roboto">+</div>
            <div className="text-md font-roboto font-bold">New Chat</div>
          </div>
        </button>
        <div className="">
          <hr className="border-t border-black my-4" />
        </div>
        <div className="font-roboto font-bold ml-8 text-start">History</div>
        <div>
          <Session text={"Composite Pattern"} />
          <Session text={"Observer Pattern"} />
          <Session text={"Quiz Question Assistance"} />
          <Session text={"Student Query Summary"} />
        </div>
      </div>
      <div className="flex flex-col w-3/4 h-screen justify-between">
        <div className="flex-flex-col">
          <div className="font-roboto font-bold text-2xl text-left mt-6 ml-12 mb-6">
            AI Assistant 🌟
          </div>
          <div className="overflow-y-auto">
          <AIMessage message = {"Hi! Ask me a question, or select one of the options below. "}/>
          <StudentMessage message = {"Please explain to me how the composite pattern works."}/>
          </div>
        </div>
        <div className=" max-h-2/3 flex flex-row items-center justify-between border border-[#8C8C8C] py-2 my-12 mx-20">
          <textarea className="ml-2 text-sm w-full outline-none max-h-2/3"></textarea>
          <img className=" mx-2 w-3 h-3" src="./send.png" alt="send" />
        </div>
      </div>
    </div>
  );
};

export default StudentChat;
