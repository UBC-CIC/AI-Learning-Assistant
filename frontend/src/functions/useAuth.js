import { useEffect, useState } from "react";
import {
  retrieveJwtToken,
  retrieveUser,
  getIdentityCredentials,
} from "./authenticationUtils";

// Retrieves temporary credentials for user
export function useAuthentication() {
  const [user, setUser] = useState("");
  const [jwtToken, setJwtToken] = useState("");
  const [credentials, setCredentials] = useState();

  useEffect(() => {
    retrieveJwtToken(setJwtToken);
    retrieveUser(setUser);
  }, []);

  useEffect(() => {
    if (user && jwtToken) {
      getIdentityCredentials(jwtToken, setCredentials);
    }
  }, [user, jwtToken]);

  return { user, credentials };
}
