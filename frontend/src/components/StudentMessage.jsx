import React from "react";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import PropTypes from "prop-types";

const StudentMessage = ({message}) => {
  return (
    <div className=" ml-16 mb-4 mr-16">
      <div className="flex flex-row flex-start">
        <AccountBoxIcon fontSize="large" style={{ color: "#7DF9FF" }} />
        <div className="text-start ml-4">{message}</div>
      </div>
    </div>
  );
};
StudentMessage.propTypes = {
    message: PropTypes.string.isRequired,
  };

export default StudentMessage;
