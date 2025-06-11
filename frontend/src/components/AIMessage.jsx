import React from "react";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import PropTypes from "prop-types";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/cjs/styles/prism";

// Created a custom renderer for markdown response
const MarkdownRender = ({ content }) => {
  return (
    <ReactMarkdown
      children={content}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          return !inline && match ? (
            <SyntaxHighlighter
              style={dracula}
              language={match[1]}
              PreTag="div"
              customStyle={{ fontSize: "0.85em" }}
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    />
  );
};

const AIMessage = ({ message }) => {
  return (
    <div className="ml-16 mb-6 mr-16">
      <div className="flex flex-row flex-start">
        <AccountBoxIcon fontSize="large" style={{ color: "#5536DA" }} />
        <div
          className="text-start ml-4 text-black"
          style={{
            maxWidth: "61vw",
            width: "61vw",
            wordWrap: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          <MarkdownRender content={message} />
        </div>
      </div>
    </div>
  );
};

AIMessage.propTypes = {
  message: PropTypes.string.isRequired,
};

export default AIMessage;