import { Route, Routes } from "react-router-dom";
// import Home from "../pages/Home/Home";
import Login from "../pages/Login";
import MainApp from "../pages/MainApp";
import LoadData from "../pages/LoadData";

const RoutesTree = () => {
  return (
      <Routes>
        <Route path="/" element={<MainApp/>} />
        <Route path="/login" element={<Login/>}/>
        <Route path="/load-data" element={<LoadData/>}/>

      </Routes>
  );
};

export default RoutesTree;
