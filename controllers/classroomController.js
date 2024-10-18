// controllers/classroomController.js
const { db, admin } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const broadcastEvent = require("../utils/broadcast");

const classroomsCollection = db.collection("classrooms");

// Raise hand
const raiseHand = async (req, res) => {
  const { studentId, classroomId, studentName } = req.body;

  const classroomRef = classroomsCollection.doc(classroomId);
  const classroomDoc = await classroomRef.get();

  if (classroomDoc.exists) {
    const classroomData = classroomDoc.data();
    const queue = classroomData.queue || [];

    if (!queue.some((student) => student.id === studentId)) {
      queue.push({ id: studentId, name: studentName });
      await classroomRef.update({ queue });
      broadcastEvent(req.app.locals.clients, classroomId, "queueUpdate", queue);
    }
    res.sendStatus(200);
  } else {
    res.status(404).json({ message: "Classroom not found" });
  }
};

// Lower hand
const lowerHand = async (req, res) => {
  const { studentId, classroomId } = req.body;

  const classroomRef = classroomsCollection.doc(classroomId);
  const classroomDoc = await classroomRef.get();

  if (classroomDoc.exists) {
    const classroomData = classroomDoc.data();
    let queue = classroomData.queue || [];

    queue = queue.filter((student) => student.id !== studentId);
    await classroomRef.update({ queue });
    broadcastEvent(req.app.locals.clients, classroomId, "queueUpdate", queue);
    res.sendStatus(200);
  } else {
    res.status(404).json({ message: "Classroom not found" });
  }
};

// Select student
const selectStudent = async (req, res) => {
  const { classroomId, isColdCall } = req.body;

  const classroomRef = classroomsCollection.doc(classroomId);
  const classroomDoc = await classroomRef.get();

  if (!classroomDoc.exists) return res.sendStatus(404);

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
      classroomId,
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
    classroomId,
    "studentSelected",
    selectedStudent
  );
  broadcastEvent(req.app.locals.clients, classroomId, "participationUpdate", {
    student: selectedStudent,
    count: participation[selectedStudent.id],
  });

  res.sendStatus(200);
};

// Reset queue
const resetQueue = async (req, res) => {
  const { classroomId } = req.body;

  const classroomRef = classroomsCollection.doc(classroomId);
  const classroomDoc = await classroomRef.get();

  if (classroomDoc.exists) {
    await classroomRef.update({
      queue: [],
      selectedStudent: null,
    });
    broadcastEvent(req.app.locals.clients, classroomId, "queueReset", null);
    res.sendStatus(200);
  } else {
    res.status(404).json({ message: "Classroom not found" });
  }
};

// Create classroom
const createClassroom = async (req, res) => {
  const { name, creatorId } = req.body;

  try {
    // Verify if creatorId exists in users collection
    const userDoc = await db.collection("users").doc(creatorId).get();
    if (!userDoc.exists) {
      return res.status(400).json({ message: "Invalid creator ID." });
    }

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
  const { classroomId, studentName, studentId } = req.body;

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
      classroomId,
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

  const classroomRef = classroomsCollection.doc(classroomId);
  const classroomDoc = await classroomRef.get();

  if (!classroomDoc.exists) {
    return res.status(404).json({ message: "Classroom not found" });
  }

  const classroomName = classroomDoc.data().name;
  res.status(200).json({ message: "Classroom found", classroomName });
};

module.exports = {
  raiseHand,
  lowerHand,
  selectStudent,
  resetQueue,
  createClassroom,
  logAttendance,
  verifyClassroom,
};
