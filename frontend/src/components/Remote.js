// src/components/Remote.js
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { FaHandPointer, FaRandom, FaRedo } from "react-icons/fa";
import "../css/Remote.css";

const Remote = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userID");
  const classroomId = searchParams.get("classroomID");

  // Authentication States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Classroom List States
  const [classrooms, setClassrooms] = useState([]);
  const [classroomsError, setClassroomsError] = useState("");
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);

  // Remote Control States
  const [classroomName, setClassroomName] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);

  // EventSource State
  const [eventSource, setEventSource] = useState(null);

  // Effect to verify authentication on component mount
  useEffect(() => {
    // Optionally, check for a token in localStorage or cookies
    // For simplicity, we'll assume authentication is based on sign-in in this component
  }, []);

  // Handle Sign-In Form Submission
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError("");

    try {
      const response = await axios.post("http://localhost:3000/login", {
        email,
        password,
      });

      if (response.data.success) {
        setIsAuthenticated(true);
        // Redirect to /remote?userID=...
        navigate(`/remote?userID=${response.data.user.id}`);
      } else {
        setAuthError(response.data.message || "Authentication failed.");
      }
    } catch (error) {
      console.error("Error during sign in:", error);
      setAuthError(
        error.response?.data?.message ||
          "An error occurred during sign in. Please try again."
      );
    }
  };

  // Fetch Classrooms Created by the User
  const fetchUserClassrooms = async (userId) => {
    setLoadingClassrooms(true);
    setClassroomsError("");

    try {
      const token = localStorage.getItem("authToken"); // Adjust based on your auth implementation

      const response = await axios.get(
        `http://localhost:3000/user-classrooms/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Include token if required
          },
        }
      );

      if (response.data.success) {
        setClassrooms(response.data.classrooms);
      } else {
        setClassroomsError(
          response.data.message || "Failed to fetch classrooms."
        );
      }
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      setClassroomsError(
        error.response?.data?.message ||
          "An error occurred while fetching classrooms."
      );
    } finally {
      setLoadingClassrooms(false);
    }
  };

  // Effect to fetch classrooms if user is authenticated and on /remote?userID=...
  useEffect(() => {
    if (userId) {
      setIsAuthenticated(true);
      fetchUserClassrooms(userId);
    }
  }, [userId]);

  // Handle Selecting a Classroom for Remote Control
  const handleSelectClassroom = (classroom) => {
    // Navigate to /remote?userID=...&classroomID=...
    navigate(`/remote?userID=${userId}&classroomID=${classroom.id}`);
  };

  // Set up EventSource when classroomId is present
  useEffect(() => {
    if (!classroomId) return;

    // Initialize EventSource
    const newEventSource = new EventSource(
      `http://localhost:3000/events?classroomId=${classroomId}&role=remote`
    );

    newEventSource.addEventListener("initialData", (event) => {
      const data = JSON.parse(event.data);
      setQueue(data.queue);
      setAttendanceList(data.attended);
      setSelectedStudent(data.selectedStudent);
      setClassroomName(data.name);
    });

    newEventSource.addEventListener("queueUpdate", (event) => {
      const newQueue = JSON.parse(event.data);
      setQueue(newQueue);
    });

    newEventSource.addEventListener("attendanceUpdate", (event) => {
      const newAttendance = JSON.parse(event.data);
      setAttendanceList(newAttendance);
    });

    newEventSource.addEventListener("studentSelected", (event) => {
      const student = JSON.parse(event.data);
      setSelectedStudent(student);
    });

    newEventSource.addEventListener("queueReset", () => {
      setSelectedStudent(null);
      setQueue([]);
    });

    setEventSource(newEventSource);

    // Cleanup on unmount or when classroomId changes
    return () => {
      newEventSource.close();
    };
  }, [classroomId]);

  // Remote Control Functions
  const selectStudent = (isColdCall = false) => {
    axios
      .post("http://localhost:3000/selectStudent", {
        classroomId,
        isColdCall,
      })
      .catch((error) => {
        console.error("Error selecting student:", error);
      });
  };

  const resetQueue = () => {
    axios
      .post("http://localhost:3000/resetQueue", {
        classroomId,
      })
      .catch((error) => {
        console.error("Error resetting queue:", error);
      });
  };

  // Remote Control Interface
  const renderRemoteControl = () => (
    <div className="remote-content">
      <div className="remote-buttons">
        <button
          className="remote-btn remote-btn-select"
          onClick={() => selectStudent(false)}
        >
          <FaHandPointer className="remote-icon" /> Select Student
        </button>
        <button
          className="remote-btn remote-btn-cold-call"
          onClick={() => selectStudent(true)}
        >
          <FaRandom className="remote-icon" /> Cold Call
        </button>
        <button className="remote-btn remote-btn-reset" onClick={resetQueue}>
          <FaRedo className="remote-icon" /> Reset Queue
        </button>
      </div>
      <div className="remote-selected">
        <h3>Selected Student</h3>
        {selectedStudent ? (
          <div className="remote-selected-student">{selectedStudent.name}</div>
        ) : (
          <p>No student selected</p>
        )}
      </div>
    </div>
  );

  // Classroom List Interface
  const renderClassroomList = () => (
    <div className="remote-classrooms-list">
      <h2>Your Classrooms</h2>
      {loadingClassrooms ? (
        <p>Loading classrooms...</p>
      ) : classroomsError ? (
        <p className="remote-error-message">{classroomsError}</p>
      ) : classrooms.length === 0 ? (
        <p>You have not created any classrooms yet.</p>
      ) : (
        <ul className="remote-classroom-list">
          {classrooms.map((classroom) => (
            <li key={classroom.id} className="remote-classroom-item">
              <span className="remote-classroom-name">{classroom.name}</span>
              <span className="remote-classroom-id">ID: {classroom.id}</span>
              <button
                className="remote-button-primary"
                onClick={() => handleSelectClassroom(classroom)}
              >
                Manage Remote
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // Sign-In Form Interface
  const renderSignInForm = () => (
    <div className="remote-sign-in-container">
      <h2>Sign In to Manage Your Classrooms</h2>
      <form onSubmit={handleSignIn} className="remote-sign-in-form">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="remote-input-field"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="remote-input-field"
          required
        />
        {authError && <p className="remote-error-message">{authError}</p>}
        <button type="submit" className="remote-button-primary">
          Sign In
        </button>
      </form>
    </div>
  );

  return (
    <div className="remote-container">
      {/* Navigation Bar */}
      {classroomId && (
        <nav className="remote-nav">
          <span className="remote-title">
            {classroomName
              ? `${classroomName} - Remote Control`
              : "Remote Control"}
          </span>
          <span className="remote-classroom-id">ID: {classroomId}</span>
        </nav>
      )}

      {/* Conditional Rendering Based on Authentication and Query Parameters */}
      {!isAuthenticated && !userId ? (
        renderSignInForm()
      ) : isAuthenticated && userId && !classroomId ? (
        renderClassroomList()
      ) : isAuthenticated && userId && classroomId ? (
        renderRemoteControl()
      ) : (
        <p className="remote-info-message">Invalid URL parameters.</p>
      )}
    </div>
  );
};

export default Remote;
