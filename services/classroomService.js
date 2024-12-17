// services/classroomService.js
const { db, admin } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

// Function to get classrooms subcollection reference
const getClassroomsCollection = (classID) => {
  return db.collection("classes").doc(classID).collection("classrooms");
};

const getClassroomData = async (classID, classroomId) => {
  const doc = await getClassroomsCollection(classID).doc(classroomId).get();
  if (doc.exists) {
    return doc.data();
  }
  return null;
};

const createClassroom = async (name, creatorId, classID) => {
  const classroomId = uuidv4().slice(0, 6);
  const classroomRef = getClassroomsCollection(classID).doc(classroomId);
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

module.exports = {
  getClassroomData,
  createClassroom,
};
