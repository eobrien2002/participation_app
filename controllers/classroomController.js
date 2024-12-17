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
  const { studentId, classroomId, studentName, classID } = req.body;

  if (!classID) {
    return res.status(400).json({ message: "Class ID is required." });
  }

  const classroomsCollection = getClassroomsCollection(classID);
  const classroomRef = classroomsCollection.doc(classroomId);
  const classroomDoc = await classroomRef.get();

  if (classroomDoc.exists) {
    const classroomData = classroomDoc.data();
    const queue = classroomData.queue || [];

    if (!queue.some((student) => student.id === studentId)) {
      queue.push({ id: studentId, name: studentName });
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

// Repeat similar changes for other controller methods...

// Lower hand
const lowerHand = async (req, res) => {
  const { studentId, classroomId, classID } = req.body;

  if (!classID) {
    return res.status(400).json({ message: "Class ID is required." });
  }

  const classroomsCollection = getClassroomsCollection(classID);
  const classroomRef = classroomsCollection.doc(classroomId);
  const classroomDoc = await classroomRef.get();

  if (classroomDoc.exists) {
    const classroomData = classroomDoc.data();
    let queue = classroomData.queue || [];

    queue = queue.filter((student) => student.id !== studentId);
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
  const { isColdCall, userID } = req.body; // Extract from request body

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

    const classroomData = classroomDoc.data();
    let selectedStudent = null;

    if (isColdCall) {
      const attendedStudents = classroomData.attended || [];
      if (attendedStudents.length === 0) return res.sendStatus(200);
      selectedStudent =
        attendedStudents[Math.floor(Math.random() * attendedStudents.length)];
    } else {
      const queue = classroomData.queue || [];
      if (queue.length === 0) return res.sendStatus(200);
      const sortedQueue = [...queue].sort(
        (a, b) =>
          (classroomData.participation?.[a.id] || 0) -
          (classroomData.participation?.[b.id] || 0)
      );
      selectedStudent = sortedQueue[0];
    }

    if (!selectedStudent) return res.sendStatus(200);

    // Remove selected student from the queue if present
    let updatedQueue = classroomData.queue || [];
    const isInQueue = updatedQueue.some(
      (student) => student.id === selectedStudent.id
    );
    if (isInQueue) {
      updatedQueue = updatedQueue.filter(
        (student) => student.id !== selectedStudent.id
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
    participation[selectedStudent.id] =
      (participation[selectedStudent.id] || 0) + 1;

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
        count: participation[selectedStudent.id],
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

// Create classroom
const createClassroom = async (req, res) => {
  const { name, creatorId, classID } = req.body;

  if (!classID) {
    return res.status(400).json({ message: "Class ID is required." });
  }

  try {
    // Verify if creatorId exists in users collection
    const userDoc = await db.collection("users").doc(creatorId).get();
    if (!userDoc.exists) {
      return res.status(400).json({ message: "Invalid creator ID." });
    }

    const classroomsCollection = getClassroomsCollection(classID);
    const classroomId = uuidv4().slice(0, 6);
    const classroomRef = classroomsCollection.doc(classroomId);
    await classroomRef.set({
      name,
      queue: [],
      participation: {},
      attended: [],
      selectedStudent: null,
      creatorId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ classroomId });
  } catch (error) {
    console.error("Error creating classroom:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Log attendance
const logAttendance = async (req, res) => {
  const { classroomId, studentName, studentId, classID } = req.body;

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

  if (!attended.some((student) => student.id === studentId)) {
    attended.push({ id: studentId, name: studentName });
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

// Verify classroom
const verifyClassroom = async (req, res) => {
  const { classroomId } = req.body;

  if (!classroomId) {
    return res.status(400).json({ message: "Classroom ID is required." });
  }

  try {
    const classesSnapshot = await db.collection("classes").get();

    for (const classDoc of classesSnapshot.docs) {
      const classroomSnapshot = await classDoc.ref
        .collection("classrooms")
        .doc(classroomId)
        .get();

      if (classroomSnapshot.exists) {
        return res.status(200).json({
          className: classDoc.data().name,
          classroomName: classroomSnapshot.data().name, // Corrected key name
          classID: classDoc.id,
        });
      }
    }

    return res.status(404).json({ message: "Classroom not found." });
  } catch (error) {
    console.error("Error in verifyClassroom:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get user classrooms
const getUserClassrooms = async (req, res) => {
  const { userId, classID } = req.params;

  try {
    const classroomsCollection = db
      .collection("classes")
      .doc(classID)
      .collection("classrooms");
    const classroomsSnapshot = await classroomsCollection
      .where("creatorId", "==", userId)
      .get();

    if (classroomsSnapshot.empty) {
      return res.status(200).json({ success: true, classrooms: [] });
    }

    const classrooms = [];
    classroomsSnapshot.forEach((doc) => {
      const data = doc.data();
      classrooms.push({
        id: doc.id,
        name: data.name,
        createdAt: data.createdAt,
      });
    });

    res.status(200).json({ success: true, classrooms });
  } catch (error) {
    console.error("Error fetching user classrooms:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
  raiseHand,
  lowerHand,
  selectStudent,
  resetQueue,
  createClassroom,
  logAttendance,
  verifyClassroom,
  getUserClassrooms,
};
