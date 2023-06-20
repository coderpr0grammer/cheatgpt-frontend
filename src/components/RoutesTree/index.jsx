import { Route, Routes } from "react-router-dom";
// import Home from "../pages/Home/Home";
import Login from "../pages/Login";
import MainApp from "../pages/MainApp";

const RoutesTree = () => {
  return (
      <Routes>
        <Route path="/" element={<MainApp/>} />
        <Route path="/login" element={<Login/>}/>
      </Routes>
  );
};

export default RoutesTree;
