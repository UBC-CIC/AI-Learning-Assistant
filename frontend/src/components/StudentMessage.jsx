import React from "react";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import PropTypes from "prop-types";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/cjs/styles/prism";

const StudentMessage = ({ message }) => {
  const renderCodeBlock = (code, language) => {
    return (
      <SyntaxHighlighter
        language={language.toLowerCase()}
        style={dracula}
        customStyle={{
          fontSize: "0.85em",
        }}
      >
        {code}
      </SyntaxHighlighter>
    );
  };

  return (
    <div className="ml-16 mb-6 mr-16">
      <div className="flex flex-row-reverse items-start">
        <AccountBoxIcon fontSize="large" style={{ color: "#00FFFF" }} />
        {/* Chat Bubble for Bot Message */}
        <div
          className="ml-4 p-4 bg-gray-100 text-black rounded-xl shadow-md text-left"
          style={{ maxWidth: "60vw", wordWrap: "break-word" }}
        >
          {message.split("```").map((part, index) => {
            if (index % 2 === 1) {
              const [language, ...codeLines] = part.split("\n");
              const code = codeLines.join("\n");
              return renderCodeBlock(code, language.trim());
            }
            return part;
          })}
        </div>
      </div>
    </div>
  );
};

StudentMessage.propTypes = {
  message: PropTypes.string.isRequired,
};

export default StudentMessage;
