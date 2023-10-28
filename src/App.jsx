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
        clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
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
