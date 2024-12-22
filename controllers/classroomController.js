// controllers/classroomController.js
const { db, admin } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const broadcastEvent = require("../utils/broadcast");

// Updated to reference classrooms within a specific class
const getClassroomsCollection = (classID) => {
  return db.collection("classes").doc(classID).collection("classrooms");
};

// Raise hand
const raiseHand = async (req, res) => {
  const { userID, studentId, classroomId, studentName, classID } = req.body;

  if (!classID) {
    return res.status(400).json({ message: "Class ID is required." });
  }

  const classroomsCollection = getClassroomsCollection(classID);
  const classroomRef = classroomsCollection.doc(classroomId);
  const classroomDoc = await classroomRef.get();

  if (classroomDoc.exists) {
    const classroomData = classroomDoc.data();
    const queue = classroomData.queue || [];

    if (!queue.some((student) => student.userID === studentId)) {
      queue.push({ userID: userID, StudentId: studentId, name: studentName });
      await classroomRef.update({ queue });
      broadcastEvent(
        req.app.locals.clients,
        `${classID}_${classroomId}`,
        "queueUpdate",
        queue
      );
    }
    res.sendStatus(200);
  } else {
    res.status(404).json({ message: "Classroom not found" });
  }
};

// Lower hand
const lowerHand = async (req, res) => {
  const { userID, studentId, classroomId, classID } = req.body;

  if (!classID) {
    return res.status(400).json({ message: "Class ID is required." });
  }

  const classroomsCollection = getClassroomsCollection(classID);
  const classroomRef = classroomsCollection.doc(classroomId);
  const classroomDoc = await classroomRef.get();

  if (classroomDoc.exists) {
    const classroomData = classroomDoc.data();
    let queue = classroomData.queue || [];

    queue = queue.filter((student) => student.userID !== userID);
    await classroomRef.update({ queue });
    broadcastEvent(
      req.app.locals.clients,
      `${classID}_${classroomId}`,
      "queueUpdate",
      queue
    );
    res.sendStatus(200);
  } else {
    res.status(404).json({ message: "Classroom not found" });
  }
};

// Select student
const selectStudent = async (req, res) => {
  const { classID, classroomId } = req.params; // Extract from URL params
  const { isColdCall, section } = req.body; // Extract from request body

  if (!classID || !classroomId) {
    return res
      .status(400)
      .json({ message: "Class ID and Classroom ID are required." });
  }

  try {
    // 1) Get the CLASS doc (the parent)
    const classRef = db.collection("classes").doc(classID);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return res.status(404).json({ message: "Class not found." });
    }
    const classData = classDoc.data();
    // HERE is where the sections actually live!
    const studentSections = classData.studentSections || {};

    // 2) Get the CLASSROOM doc for queue/attendance/participation
    const classroomRef = classRef.collection("classrooms").doc(classroomId);
    const classroomDoc = await classroomRef.get();

    if (!classroomDoc.exists) {
      return res.status(404).json({ message: "Classroom not found." });
    }
    const classroomData = classroomDoc.data();

    let selectedStudent = null;

    // Function to filter students by section
    const filterBySection = (students) => {
      if (!section) return students;
      return students.filter(
        (student) => studentSections[student.userID] === section
      );
    };

    if (isColdCall) {
      const filteredAttended = classroomData.attended || [];
      if (filteredAttended.length === 0) return res.sendStatus(200);
      selectedStudent =
        filteredAttended[Math.floor(Math.random() * filteredAttended.length)];
    } else {
      const queue = classroomData.queue || [];
      const filteredQueue = filterBySection(queue);
      if (filteredQueue.length === 0) return res.sendStatus(200);
      const sortedQueue = [...filteredQueue].sort(
        (a, b) =>
          (classroomData.participation?.[a.userID] || 0) -
          (classroomData.participation?.[b.userID] || 0)
      );
      selectedStudent = sortedQueue[0];
    }

    if (!selectedStudent) return res.sendStatus(200);

    // Remove selected student from the queue if present
    let updatedQueue = classroomData.queue || [];
    const isInQueue = updatedQueue.some(
      (student) => student.userID === selectedStudent.userID
    );
    if (isInQueue) {
      updatedQueue = updatedQueue.filter(
        (student) => student.userID !== selectedStudent.userID
      );
      await classroomRef.update({ queue: updatedQueue });
      broadcastEvent(
        req.app.locals.clients,
        `${classID}_${classroomId}`,
        "queueUpdate",
        updatedQueue
      );
    }

    // Update participation
    const participation = classroomData.participation || {};
    participation[selectedStudent.userID] =
      (participation[selectedStudent.userID] || 0) + 1;

    await classroomRef.update({
      selectedStudent,
      participation,
    });

    broadcastEvent(
      req.app.locals.clients,
      `${classID}_${classroomId}`,
      "studentSelected",
      selectedStudent
    );
    broadcastEvent(
      req.app.locals.clients,
      `${classID}_${classroomId}`,
      "participationUpdate",
      {
        student: selectedStudent,
        count: participation[selectedStudent.userID],
      }
    );

    res.sendStatus(200);
  } catch (error) {
    console.error("Error selecting student:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Reset queue
const resetQueue = async (req, res) => {
  const { classID, classroomId } = req.params; // Extract from URL params

  if (!classID || !classroomId) {
    return res
      .status(400)
      .json({ message: "Class ID and Classroom ID are required." });
  }

  try {
    const classroomsCollection = getClassroomsCollection(classID);
    const classroomRef = classroomsCollection.doc(classroomId);
    const classroomDoc = await classroomRef.get();

    if (!classroomDoc.exists) {
      return res.status(404).json({ message: "Classroom not found." });
    }

    await classroomRef.update({
      queue: [],
      selectedStudent: null,
    });

    broadcastEvent(
      req.app.locals.clients,
      `${classID}_${classroomId}`,
      "queueReset",
      null
    );

    res.sendStatus(200);
  } catch (error) {
    console.error("Error resetting queue:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Log attendance
const logAttendance = async (req, res) => {
  const { userID, classroomId, studentName, studentId, classID } = req.body;

  if (!classID) {
    return res.status(400).json({ message: "Class ID is required." });
  }

  const classroomsCollection = getClassroomsCollection(classID);
  const classroomRef = classroomsCollection.doc(classroomId);
  const classroomDoc = await classroomRef.get();

  if (!classroomDoc.exists) {
    return res.status(404).json({ message: "Classroom not found" });
  }

  const classroomData = classroomDoc.data();
  const attended = classroomData.attended || [];

  if (!attended.some((student) => student.userID === userID)) {
    attended.push({ userID: userID, name: studentName, studentID: studentId });
    await classroomRef.update({ attended });
    broadcastEvent(
      req.app.locals.clients,
      `${classID}_${classroomId}`,
      "attendanceUpdate",
      attended
    );
    res.status(200).json({ message: "Attendance logged" });
  } else {
    res.status(200).json({ message: "Student already logged" });
  }
};

module.exports = {
  raiseHand,
  lowerHand,
  selectStudent,
  resetQueue,
  logAttendance,
};
