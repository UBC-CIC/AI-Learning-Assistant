import React from "react";

// default styled container
const PageContainer = ({ children }) => {
  return (
    <div className="mx-auto flex min-h-screen max-h-screen max-width-full h-screen overflow-hidden box-border">
      {children}
    </div>
  );
};

export default PageContainer;
