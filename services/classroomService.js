// services/classroomService.js
const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

const classroomsCollection = db.collection("classrooms");

const getClassroomData = async (classroomId) => {
  const doc = await classroomsCollection.doc(classroomId).get();
  if (doc.exists) {
    return doc.data();
  }
  return null;
};

const createClassroom = async (name, creatorId) => {
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
  return classroomId;
};

// Add more classroom-related services as needed

module.exports = {
  getClassroomData,
  createClassroom,
};
