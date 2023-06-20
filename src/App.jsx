import { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter as Router } from "react-router-dom";
import AuthenticationContextProvider from "./infrastructure/authentication/authentication.context";
import RoutesTree from "./components/RoutesTree";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <GoogleOAuthProvider
        clientId='1089241278813-lidkki376ftqe1pkmnnos76co27nm0h7.apps.googleusercontent.com'
      >
        <Router>
          <AuthenticationContextProvider>
            <RoutesTree />
          </AuthenticationContextProvider>
        </Router>
      </GoogleOAuthProvider>
    </>
  );
}

export default App;
