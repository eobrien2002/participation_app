// App.js
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./components/HomePage";
import Classroom from "./components/Classroom";
import Student from "./components/Student";
import VerifyEmail from "./components/VerifyEmail";
import ResetPassword from "./components/ResetPassword";
import Remote from "./components/Remote";
import Dashboard from "./components/Dashboard";
import ClassPage from "./components/ClassPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/classroom/:classroomId" element={<Classroom />} />
        <Route path="/student/:classroomId" element={<Student />} />
        <Route path="/remote" element={<Remote />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/class" element={<ClassPage />} />
      </Routes>
    </Router>
  );
}

export default App;
