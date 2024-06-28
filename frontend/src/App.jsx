import "./App.css";
// amplify
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";

// Amplify.configure({
//   API: {
//     REST: {
//       MyApi: {
//         endpoint: process.env.REACT_APP_API_ENDPOINT
//       },
//     },
//   },
//   Auth: {
//     Cognito: {
//       region: process.env.REACT_APP_AWS_REGION,
//       userPoolClientId: process.env.REACT_APP_COGNITO_USER_POOL_CLIENT_ID,
//       userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
//       allowGuestAccess: false,
//     },
//   },
// });

function App() {
  return <h1> hi </h1>;
}

export default App;
