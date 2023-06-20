import { getAuth } from "firebase/auth";
import { GoogleLogin } from "@react-oauth/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../utils/firebaseConfig";
import Logo from "../../../assets/test-cheating.png";

const Login = () => {
  const auth = getAuth();

  const responseMessage = (response) => {
    // response.preventDefault()
    console.log(response);
    // Build Firebase credential with the Google ID token.
    const idToken = response.credential;
    const credential = GoogleAuthProvider.credential(idToken);

    // Sign in with credential from the Google user.
    signInWithCredential(auth, credential)
      .then((u) => {
        async function checkIfUserExists() {
          const docRef = doc(db, "users", u.user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            console.log("Document data:", docSnap.data());
          } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
            console.log("u.user", u.user);
            await setDoc(doc(db, "users", u.user.uid), {
              name: u.user.displayName,
              email: u.user.email,
            });
          }
        }
        checkIfUserExists();
        console.log("u", u);
      })
      .catch((error) => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // The email of the user's account used.
        const email = error.email;
        // The credential that was used.
        const credential = GoogleAuthProvider.credentialFromError(error);
        // ...
        console.log(errorCode, errorMessage);
        alert(errorCode, errorMessage);
      });
  };
  const errorMessage = (error) => {
    console.log(error);
    alert(error);
  };

  return (
    <>
      <section className="h-screen flex flex-col">
        <div className="flex-grow">
          <div className="h-full">
            <div className="w-full h-full">
              <div className="h-full bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 items-center">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                  <div className="flex justify-center">
                    <img
                      src={Logo}
                      width={75}
                      alt="Skm Logo"
                      className="mx-auto"
                    />
                  </div>
                  <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Sign in to your account
                  </h2>
                  <p className="text-sm text-gray-500 text-center mt-2">
                    Do some devious work with CheatGPT
                  </p>
                </div>

                <div className="login-box w-auto mt-4 flex flex-col rounded-lg p-2.5 bg-white items-center sm:mx-auto shadow">
                  <GoogleLogin
                    onSuccess={responseMessage}
                    onError={errorMessage}
                    text="continue_with"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <footer className="bg-white">
          <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
            <p className="mt-10 text-center text-base text-gray-400">
              © {new Date().getFullYear()} CheatGPT. All rights reserved.
            </p>
          </div>
        </footer>
      </section>
    </>
  );
};

export default Login;
