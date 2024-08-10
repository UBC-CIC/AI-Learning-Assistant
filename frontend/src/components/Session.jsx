import PropTypes from "prop-types";

const Session = ({
  text,
  session,
  setSession,
  deleteSession,
  selectedSession,
}) => {
  const isSelected =
    selectedSession && selectedSession.session_id === session.session_id;
  return (
    <div
      onClick={() => setSession(session)}
      style={{
        background: isSelected
          ? "linear-gradient(90deg, rgb(96.471% 43.137% 100%) 0%, rgb(88.825% 40.478% 98.243%) 6.25%, rgb(81.673% 37.99% 96.599%) 12.5%, rgb(75.014% 35.674% 95.069%) 18.75%, rgb(68.848% 33.529% 93.652%) 25%, rgb(63.176% 31.556% 92.348%) 31.25%, rgb(57.996% 29.755% 91.158%) 37.5%, rgb(53.31% 28.125% 90.081%) 43.75%, rgb(49.118% 26.667% 89.118%) 50%, rgb(45.418% 25.38% 88.267%) 56.25%, rgb(42.212% 24.265% 87.531%) 62.5%, rgb(39.499% 23.321% 86.907%) 68.75%, rgb(37.279% 22.549% 86.397%) 75%, rgb(35.553% 21.949% 86%) 81.25%, rgb(34.32% 21.52% 85.717%) 87.5%, rgb(33.58% 21.262% 85.547%) 93.75%, rgb(33.333% 21.176% 85.49%) 100% )"
          : "#5536DA",
      }}
      className="cursor-pointer rounded flex flex-row justify-between items-center my-2 mx-8 py-2 px-4"
    >
      {" "}
      <div className="flex flex-row items-center justify-start gap-6">
        <img src="/message.png" alt="back" className="w-2 h-2" />
        <div className="text-[#e8e8e8] font-light font-inter text-xs">
          {text}
        </div>
      </div>
      <img
        onClick={() => deleteSession(session)}
        src="/delete.png"
        alt="back"
        className="cursor-pointer w-3 h-3"
      />
    </div>
  );
};

Session.propTypes = {
  text: PropTypes.string.isRequired,
};

export default Session;
