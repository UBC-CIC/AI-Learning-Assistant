const StudentChat = () => {
  return (
    <div className="flex flex-row">
      <div className="flex flex-col w-1/4 h-screen bg-gradient-to-tr from-purple-300 to-cyan-100">
        <div className="mt-2 mb-2 ml-4">
          <img
            className="w-8 h-8"
            src="./ArrowCircleDownRounded.png"
            alt="back"
          />
        </div>
        <button className="border border-black ml-8 mr-8 mt-0 mb-0 bg-transparent pt-2 pb-2">
          <div className="flex flex-row gap-6">
            <div className="text-sm font-roboto">+</div>
            <div className="text-sm font-roboto">New Chat</div>
          </div>
        </button>
        <div className="">
        <hr className="border-t border-black my-4" />

        </div>
        <div>History</div>
        <div>session</div>
      </div>
      <div className="flex flex-col w-3/4 h-screen">
        right
        <div>title</div>
        <div className="flex flex-row">
          <div>ai photo</div>
          <div>ai chat</div>
        </div>
        <div className="flex flex-row">
          <div>button 1 </div>
          <div>button 2</div>
        </div>
        <div className="flex flex-row justify-between">
          <div>message text</div>
          <div>send button</div>
        </div>
      </div>
    </div>
  );
};

export default StudentChat;
