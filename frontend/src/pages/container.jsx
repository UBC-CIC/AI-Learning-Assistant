import React from "react";


// default styled container
const PageContainer = ({ children }) => {
  return (
    <div className="mx-auto flex min-h-screen max-h-screen max-width-full h-screen overflow-hidden box-border bg-[#F8F9FD]">
      {children}
    </div>
  );
};

export default PageContainer;
