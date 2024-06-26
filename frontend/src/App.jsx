import React, { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
  Amplify.configure({
    // API: {
    //   GraphQL: {
    //     endpoint: process.env.REACT_APP_API_ENDPOINT,
    //     region: process.env.REACT_APP_AWS_REGION,
    //     defaultAuthMode: "userPool",
    //   },
    // },
    Auth: {
      Cognito: {
        region: process.env.REACT_APP_AWS_REGION,
        userPoolClientId: process.env.REACT_APP_COGNITO_USER_POOL_CLIENT_ID,
        userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
        allowGuestAccess: false,
      },
    },
  });

  const [count, setCount] = useState(0);

  return (
    <>
      {/* <Login /> */}
      <p> pls </p>
    </>
  );
}

export default App;
