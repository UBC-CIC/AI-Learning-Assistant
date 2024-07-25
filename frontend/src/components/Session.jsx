import PropTypes from "prop-types";

const Session = ({ text }) => {
  return (
    <div className="bg-[#5536DA] rounded flex flex-row justify-between items-center my-2 mx-8 py-2 px-4">
      <div className="flex flex-row items-center justify-start gap-6">
        <img src="/message.png" alt="back" className="w-2 h-2" />
        <div className="text-[#e8e8e8] font-light font-inter text-xs">
          {text}
        </div>
      </div>
      <img src="/delete.png" alt="back" className="w-3 h-3" />
    </div>
  );
};

Session.propTypes = {
    text: PropTypes.string.isRequired,
  };

export default Session;
