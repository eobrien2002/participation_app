import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import axios from "axios";
import "../css/Student.css";

const Student = () => {
  const { classroomId } = useParams();
  const location = useLocation();
  const { className, classroomName, classID, studentName, studentId } =
    location.state;

  const [participationCount, setParticipationCount] = useState(0);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    // Log attendance with new route structure
    axios.post(
      `http://localhost:3000/classes/${classID}/classrooms/${classroomId}/log-attendance`,
      {
        classroomId,
        studentName,
        studentId,
        classID,
      }
    );

    // Set up EventSource with classID and classroomId as query params
    const eventSource = new EventSource(
      `http://localhost:3000/events?classID=${classID}&classroomId=${classroomId}&role=student&studentId=${studentId}&studentName=${studentName}`
    );

    eventSource.addEventListener("initialData", (event) => {
      const data = JSON.parse(event.data);
      setIsHandRaised(data.queue.some((student) => student.id === studentId));
      setParticipationCount(data.participation[studentId] || 0);
    });

    eventSource.addEventListener("participationUpdate", (event) => {
      const { student, count } = JSON.parse(event.data);
      if (student.id === studentId) {
        setParticipationCount(count);
      }
    });

    eventSource.addEventListener("studentSelected", (event) => {
      const selectedStudent = JSON.parse(event.data);
      if (selectedStudent.id === studentId) {
        setIsSelected(true);
        setIsHandRaised(false);
      }
    });

    eventSource.addEventListener("queueReset", () => {
      setIsHandRaised(false);
    });

    return () => {
      eventSource.close();
    };
  }, [classroomId, studentId, studentName, classID]);

  const raiseHand = () => {
    axios.post(
      `http://localhost:3000/classes/${classID}/classrooms/${classroomId}/raiseHand`,
      {
        studentId,
        classroomId,
        studentName,
        classID,
      }
    );
    setIsHandRaised(true);
  };

  const lowerHand = () => {
    axios.post(
      `http://localhost:3000/classes/${classID}/classrooms/${classroomId}/lowerHand`,
      {
        studentId,
        classroomId,
        classID,
      }
    );
    setIsHandRaised(false);
  };

  const closeModal = () => {
    setIsSelected(false);
  };

  return (
    <div className="student-container">
      <nav className="student-nav-bar">
        <span className="student-nav-title">{classroomName}</span>
        <span className="student-classroom-id">Class ID: {classroomId}</span>
      </nav>

      <div className="student-info-card">
        <div className="student-avatar">{studentName[0]}</div>
        <h1 className="student-name">{studentName}</h1>
        <p className="student-participation-count">
          Times Participated: {participationCount}
        </p>
        <button
          className="student-hand-button"
          onClick={isHandRaised ? lowerHand : raiseHand}
        >
          {isHandRaised ? "Lower Hand" : "Raise Hand"}
        </button>
      </div>

      {isSelected && (
        <div className="student-selected-modal">
          <div className="student-selected-modal-content">
            <button className="close-modal-button" onClick={closeModal}>
              ×
            </button>
            <h2>You've been selected!</h2>
            <p>It's your turn to participate.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Student;
