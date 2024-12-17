// Classroom.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import "../css/Classroom.css";
import { FaHandPointer, FaRandom, FaRedo } from "react-icons/fa"; // Icons for buttons

const Classroom = () => {
  const { classroomId } = useParams();
  const location = useLocation();

  // Extract query parameters
  const params = new URLSearchParams(location.search);
  const classID = params.get("classID");
  const userID = params.get("userID");

  // State variables
  const [queue, setQueue] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [classroomName, setClassroomName] = useState(
    location.state?.classroomName || ""
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Validate required parameters
    if (!classID || !classroomId) {
      setErrorMessage("Missing classID or classroomId in URL parameters.");
      return;
    }

    // Set up EventSource with all required query parameters
    const eventSource = new EventSource(
      `http://localhost:3000/events?classID=${classID}&classroomId=${classroomId}&role=classroom`
    );

    eventSource.addEventListener("initialData", (event) => {
      const data = JSON.parse(event.data);
      setQueue(data.queue);
      setAttendanceList(data.attended);
      setSelectedStudent(data.selectedStudent);
      setClassroomName(data.name);
    });

    eventSource.addEventListener("queueUpdate", (event) => {
      const newQueue = JSON.parse(event.data);
      setQueue(newQueue);
    });

    eventSource.addEventListener("attendanceUpdate", (event) => {
      const newAttendance = JSON.parse(event.data);
      setAttendanceList(newAttendance);
    });

    eventSource.addEventListener("studentSelected", (event) => {
      const student = JSON.parse(event.data);
      setSelectedStudent(student);
    });

    eventSource.addEventListener("queueReset", () => {
      setSelectedStudent(null);
      setQueue([]);
    });

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      setErrorMessage("Failed to connect to server for real-time updates.");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [classID, classroomId]);

  // Updated selectStudent function to match backend route
  const selectStudent = (isColdCall = false) => {
    if (!classID || !classroomId) {
      setErrorMessage("Cannot select student without classID and classroomId.");
      return;
    }

    axios
      .post(
        `http://localhost:3000/classes/${classID}/classrooms/${classroomId}/selectStudent`,
        {
          isColdCall,
          userID, // Optionally include userID if needed by backend
        }
      )
      .catch((error) => {
        console.error("Error selecting student:", error);
        setErrorMessage("Failed to select student. Please try again.");
      });
  };

  // Updated resetQueue function to match backend route
  const resetQueue = () => {
    if (!classID || !classroomId) {
      setErrorMessage("Cannot reset queue without classID and classroomId.");
      return;
    }

    axios
      .post(
        `http://localhost:3000/classes/${classID}/classrooms/${classroomId}/resetQueue`
      )
      .catch((error) => {
        console.error("Error resetting queue:", error);
        setErrorMessage("Failed to reset queue. Please try again.");
      });
  };

  return (
    <>
      <nav className="nav-bar">
        <div>
          <span className="nav-title">{classroomName}</span>
          <span className="classroom-id">ID: {classroomId}</span>
        </div>
      </nav>
      <div className="container">
        <div className="attendance-stats">
          <div className="attendance-list">
            {attendanceList
              .slice(-20)
              .reverse()
              .map((student, index) => (
                <span key={index}>{student.name}</span>
              ))}
          </div>
          <div className="class-stats">
            <span>Total Students: {attendanceList.length}</span>
          </div>
        </div>
        <div className="main-content">
          <div className="card">
            <h2>Queue</h2>
            <div className="queue-container">
              <ul className="queue-list">
                {queue.map((student, index) => (
                  <li key={index} className="fade-in">
                    <span className="student-icon">{student.name[0]}</span>
                    {student.name}
                  </li>
                ))}
              </ul>
              <div className="button-container">
                <button
                  className="btn-select"
                  onClick={() => selectStudent(false)}
                >
                  <FaHandPointer className="icon" /> Select
                </button>
                <button
                  className="btn-cold-call"
                  onClick={() => selectStudent(true)}
                >
                  <FaRandom className="icon" /> Cold Call
                </button>
                <button className="btn-reset" onClick={resetQueue}>
                  <FaRedo className="icon" /> Reset
                </button>
              </div>
            </div>
          </div>
          <div className="card">
            <h2>Selected Student</h2>
            {selectedStudent ? (
              <div className="selected-student slide-in">
                <div className="selected-student-icon">
                  {selectedStudent.name[0]}
                </div>
                <div className="selected-student-name">
                  {selectedStudent.name}
                </div>
              </div>
            ) : (
              <p>No student selected</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Classroom;
