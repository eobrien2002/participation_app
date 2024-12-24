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
  const { classID, classroomId } = req.params;
  const { isColdCall, section } = req.body;

  if (!classID || !classroomId) {
    return res
      .status(400)
      .json({ message: "Class ID and Classroom ID are required." });
  }

  try {
    const classRef = db.collection("classes").doc(classID);
    const classDoc = await classRef.get();
    if (!classDoc.exists) {
      return res.status(404).json({ message: "Class not found." });
    }
    const classData = classDoc.data();
    const studentSections = classData.studentSections || {};

    const classroomRef = classRef.collection("classrooms").doc(classroomId);
    const classroomDoc = await classroomRef.get();
    if (!classroomDoc.exists) {
      return res.status(404).json({ message: "Classroom not found." });
    }
    const classroomData = classroomDoc.data();

    let selectedStudent = null;

    const filterBySection = (students) => {
      if (!section) return students;
      return students.filter(
        (student) => studentSections[student.userID] === section
      );
    };

    if (isColdCall) {
      const filteredAttended = classroomData.activeStudent || [];
      if (filteredAttended.length === 0) return res.sendStatus(200);
      selectedStudent =
        filteredAttended[Math.floor(Math.random() * filteredAttended.length)];
    } else {
      const queue = classroomData.queue || [];
      const filteredQueue = filterBySection(queue);
      if (filteredQueue.length === 0) return res.sendStatus(200);

      // Sorting by least participation (using the new object structure with .count)
      const sortedQueue = [...filteredQueue].sort((a, b) => {
        const aCount = classroomData.participation?.[a.userID]?.count || 0;
        const bCount = classroomData.participation?.[b.userID]?.count || 0;
        return aCount - bCount;
      });

      selectedStudent = sortedQueue[0];
    }

    if (!selectedStudent) return res.sendStatus(200);

    // Remove from queue if present
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

    // === NEW PARTICIPATION STRUCTURE ===
    const participation = classroomData.participation || {};
    if (!participation[selectedStudent.userID]) {
      participation[selectedStudent.userID] = {
        ...selectedStudent,
        count: 1,
      };
    } else {
      participation[selectedStudent.userID].count++;
    }

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
        count: participation[selectedStudent.userID]
          ? participation[selectedStudent.userID].count
          : 0,
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
  const activeStudent = classroomData.activeStudent || [];

  if (!attended.some((student) => student.userID === userID)) {
    attended.push({ userID: userID, name: studentName, studentID: studentId });
    await classroomRef.update({ attended });
  }

  if (!activeStudent.some((student) => student.userID === userID)) {
    activeStudent.push({
      userID: userID,
      name: studentName,
      studentID: studentId,
    });
    broadcastEvent(
      req.app.locals.clients,
      `${classID}_${classroomId}`,
      "attendanceUpdate",
      activeStudent
    );
    await classroomRef.update({ activeStudent });
    res.status(200).json({ message: "student added to active list" });
  } else {
    res.status(200).json({ message: "Student already logged" });
  }
};

const getClassDashboard = async (req, res) => {
  try {
    const { classID } = req.params;
    if (!classID) {
      return res
        .status(400)
        .json({ success: false, message: "classID is required" });
    }

    // 1) Reference the Class doc
    const classRef = db.collection("classes").doc(classID);
    const classDoc = await classRef.get();
    if (!classDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    // 2) Get all classrooms for this class
    const classroomsSnapshot = await classRef.collection("classrooms").get();

    // 3) Structures for aggregated data
    //    We'll also store a sessionName map to avoid repeating doc lookups
    const participationByStudent = {}; // { [userId]: totalCount }
    const participationBySession = {}; // { [classroomId]: { [userId]: number } }
    const attendanceByStudent = {}; // { [userId]: { missedCount, sessionsMissed } }
    const attendanceBySession = {}; // { [classroomId]: { [userId]: boolean } }
    const sessionNameById = {}; // { [classroomId]: string }
    const allClassroomIds = [];

    classroomsSnapshot.forEach((docSnap) => {
      const classroomId = docSnap.id;
      const data = docSnap.data();
      allClassroomIds.push(classroomId);

      // If you store a "name" or "title" in your doc, use that; otherwise fallback
      const sessionName = data.name || classroomId;
      sessionNameById[classroomId] = sessionName;

      // =========================
      // Participation
      // =========================
      const participationObj = data.participation || {};
      participationBySession[classroomId] = {};

      // Each participationObj[userID] is an object with .count, plus possibly other fields
      Object.entries(participationObj).forEach(([userID, pObj]) => {
        const count = pObj.count || 0;

        // by Student
        if (!participationByStudent[userID]) {
          participationByStudent[userID] = 0;
        }
        participationByStudent[userID] += count;

        // by Session
        participationBySession[classroomId][userID] = count;
      });

      // =========================
      // Attendance
      // =========================
      // "attended" is an array of { userID, name, ... }
      const attendedArray = data.attended || [];
      attendanceBySession[classroomId] = {};

      attendedArray.forEach((att) => {
        const sUserID = att.userID;
        attendanceBySession[classroomId][sUserID] = true;
      });
    });

    // Collect all userIDs who appear in either participation or attendance
    const allStudentUserIDs = new Set([...Object.keys(participationByStudent)]);
    Object.values(attendanceBySession).forEach((sessionMap) => {
      Object.keys(sessionMap).forEach((u) => allStudentUserIDs.add(u));
    });

    // Initialize attendanceByStudent
    allStudentUserIDs.forEach((usr) => {
      attendanceByStudent[usr] = {
        missedCount: 0,
        sessionsMissed: [],
      };
    });

    // Now figure out who missed each session
    allClassroomIds.forEach((sessionId) => {
      const sessionAttMap = attendanceBySession[sessionId];
      allStudentUserIDs.forEach((usr) => {
        if (!sessionAttMap[usr]) {
          attendanceByStudent[usr].missedCount++;
          attendanceByStudent[usr].sessionsMissed.push(sessionId);
        }
      });
    });

    // Send back aggregated data
    return res.status(200).json({
      success: true,
      data: {
        participationByStudent,
        participationBySession,
        attendanceByStudent,
        attendanceBySession,
        sessionNameById, // so we can show session names in the frontend
        allClassroomIds,
      },
    });
  } catch (error) {
    console.error("Error in getClassDashboard:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getStudentDashboard = async (req, res) => {
  try {
    const { classID, userID } = req.params;

    if (!classID || !userID) {
      return res.status(400).json({
        success: false,
        message: "classID and studentID are required",
      });
    }

    // Reference the Class document
    const classRef = db.collection("classes").doc(classID);
    const classDoc = await classRef.get();
    if (!classDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Get all classrooms (sessions) for this class
    const classroomsSnapshot = await classRef.collection("classrooms").get();

    // Structures for aggregated data
    const participationBySession = {}; // { [sessionID]: count }
    const attendanceBySession = {}; // { [sessionID]: boolean }
    const sessionNameById = {}; // { [sessionID]: string }
    const allClassroomIds = [];

    classroomsSnapshot.forEach((docSnap) => {
      const sessionID = docSnap.id;
      const data = docSnap.data();
      allClassroomIds.push(sessionID);

      // Session Name
      const sessionName = data.name || sessionID;
      sessionNameById[sessionID] = sessionName;

      // Participation
      const participationObj = data.participation || {};
      participationBySession[sessionID] = participationObj[userID]?.count || 0;

      // Attendance
      const attendedArray = data.attended || [];
      attendanceBySession[sessionID] = attendedArray.some(
        (att) => att.userID === userID
      );
    });

    // Calculate total participation and missed sessions
    let totalParticipation = 0;
    const missedSessions = [];

    allClassroomIds.forEach((sessionID) => {
      totalParticipation += participationBySession[sessionID];
      if (!attendanceBySession[sessionID]) {
        missedSessions.push({
          sessionID,
          sessionName: sessionNameById[sessionID],
        });
      }
    });

    const totalMissed = missedSessions.length;

    // Send back the aggregated data
    return res.status(200).json({
      success: true,
      data: {
        participationBySession,
        sessionNameById,
        allClassroomIds,
        totalParticipation,
        totalMissed,
        missedSessions,
      },
    });
  } catch (error) {
    console.error("Error in getStudentDashboard:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  raiseHand,
  lowerHand,
  selectStudent,
  resetQueue,
  logAttendance,
  getClassDashboard,
  getStudentDashboard,
};
