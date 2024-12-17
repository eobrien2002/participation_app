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
  const classID = searchParams.get("classID"); // Added retrieval of classID

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

  // General Error State
  const [errorMessage, setErrorMessage] = useState(""); // Define a general error state

  useEffect(() => {
    // For simplicity, assume authentication is handled by sign-in below
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
      const classesResponse = await axios.get(
        `http://localhost:3000/user-classes/${userId}`
      );

      if (!classesResponse.data.success) {
        setClassroomsError(
          classesResponse.data.message || "Failed to fetch classes."
        );
        setLoadingClassrooms(false);
        return;
      }

      const classes = classesResponse.data.classes || [];
      let allClassrooms = [];

      for (const cls of classes) {
        try {
          const classroomsResponse = await axios.get(
            `http://localhost:3000/classes/${cls.id}/user-classrooms/${userId}`
          );

          if (!classroomsResponse.data.success) {
            console.error(
              `Failed to fetch classrooms for class ${cls.id}:`,
              classroomsResponse.data.message
            );
            continue;
          }

          const classClassrooms = (
            classroomsResponse.data.classrooms || []
          ).map((room) => ({
            ...room,
            classId: cls.id,
            className: cls.name,
          }));

          allClassrooms = allClassrooms.concat(classClassrooms);
        } catch (error) {
          console.error(
            `Error fetching classrooms for class ${cls.id}:`,
            error
          );
        }
      }

      setClassrooms(allClassrooms);
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

  useEffect(() => {
    if (userId) {
      setIsAuthenticated(true);
      fetchUserClassrooms(userId);
    }
  }, [userId]);

  // Handle Selecting a Classroom
  const handleSelectClassroom = (classroom) => {
    // Navigate including classID as well
    navigate(
      `/remote?userID=${userId}&classroomID=${classroom.id}&classID=${classroom.classId}`
    );
  };

  // Set up EventSource when we have classID and classroomId
  useEffect(() => {
    if (!classID || !classroomId) {
      setErrorMessage("Missing classID or classroomID in URL parameters.");
      return;
    }

    // Clear any existing error messages
    setErrorMessage("");

    const es = new EventSource(
      `http://localhost:3000/events?classID=${classID}&classroomId=${classroomId}&role=classroom`
    );
    setEventSource(es);

    es.addEventListener("initialData", (event) => {
      const data = JSON.parse(event.data);
      setQueue(data.queue);
      setAttendanceList(data.attended);
      setSelectedStudent(data.selectedStudent);
      setClassroomName(data.name);
    });

    es.addEventListener("queueUpdate", (event) => {
      const newQueue = JSON.parse(event.data);
      setQueue(newQueue);
    });

    es.addEventListener("attendanceUpdate", (event) => {
      const newAttendance = JSON.parse(event.data);
      setAttendanceList(newAttendance);
    });

    es.addEventListener("studentSelected", (event) => {
      const student = JSON.parse(event.data);
      setSelectedStudent(student);
    });

    es.addEventListener("queueReset", () => {
      setSelectedStudent(null);
      setQueue([]);
    });

    es.onerror = (error) => {
      console.error("EventSource failed:", error);
      setErrorMessage("Failed to connect to server for real-time updates.");
      es.close();
    };

    return () => {
      es.close();
    };
  }, [classID, classroomId]);

  const selectStudent = (isColdCall = false) => {
    if (!classID || !classroomId) {
      setErrorMessage("Cannot select student without classID and classroomID.");
      return;
    }

    axios
      .post(
        `http://localhost:3000/classes/${classID}/classrooms/${classroomId}/selectStudent`,
        {
          isColdCall,
          userId, // make sure we use userId consistently
        }
      )
      .catch((error) => {
        console.error("Error selecting student:", error);
        setErrorMessage("Failed to select student. Please try again.");
      });
  };

  const resetQueue = () => {
    if (!classID || !classroomId) {
      setErrorMessage("Cannot reset queue without classID and classroomID.");
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

  const renderRemoteControl = () => (
    <div className="remote-content">
      {(!classID || !classroomId) && (
        <p className="remote-error-message">{errorMessage}</p>
      )}
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

      {!isAuthenticated && !userId ? (
        renderSignInForm()
      ) : isAuthenticated && userId && !classroomId ? (
        renderClassroomList()
      ) : isAuthenticated && userId && classroomId && classID ? (
        renderRemoteControl()
      ) : (
        <p className="remote-info-message">
          {errorMessage || "Invalid URL parameters."}
        </p>
      )}
    </div>
  );
};

export default Remote;
