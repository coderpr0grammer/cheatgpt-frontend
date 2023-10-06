import { createContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { app, db } from "../../utils/firebaseConfig";

export const AuthenticationContext = createContext();

const AuthenticationContextProvider = ({ children }) => {
  const auth = getAuth();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [uid, setUid] = useState(null);

  const navigate = useNavigate();

  // useEffect(() => {
  //   auth.onAuthStateChanged((u) => {
  //     if (u) {
  //       setUser(u);
  //       setUid(u.uid)
  //       if (location.pathname == "/login") {
  //         navigate("/load-data");
  //       }
  //     } else {
  //       if (location.pathname != '/') {
  //         navigate("/login");
  //       }
  //     }
  //   });
  // }, []);

  return (
    <AuthenticationContext.Provider
      value={{
        user,
        setUser,
        uid,
        setUid,
      }}
    >
      {children}
    </AuthenticationContext.Provider>
  );
};

export default AuthenticationContextProvider;
