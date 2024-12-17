// controllers/classController.js
const { db, admin } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

// Function to create a new class
const createClass = async (req, res) => {
  const { name, creatorId } = req.body;

  if (!name || !creatorId) {
    return res
      .status(400)
      .json({ message: "Name and Creator ID are required." });
  }

  try {
    // Verify if creatorId exists in users collection
    const userDoc = await db.collection("users").doc(creatorId).get();
    if (!userDoc.exists) {
      return res.status(400).json({ message: "Invalid creator ID." });
    }

    const classID = uuidv4().slice(0, 6);
    const classRef = db.collection("classes").doc(classID);
    await classRef.set({
      name,
      creatorId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ classID });
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get all classes for a user
const getUserClasses = async (req, res) => {
  const { userId } = req.params;

  try {
    const classesSnapshot = await db
      .collection("classes")
      .where("creatorId", "==", userId)
      .get();

    if (classesSnapshot.empty) {
      return res.status(200).json({ success: true, classes: [] });
    }

    const classes = [];
    classesSnapshot.forEach((doc) => {
      const data = doc.data();
      classes.push({
        id: doc.id,
        name: data.name,
        createdAt: data.createdAt,
      });
    });

    res.status(200).json({ success: true, classes });
  } catch (error) {
    console.error("Error fetching user classes:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const removeClass = async (req, res) => {
  const { classId } = req.params;
  const { userId } = req.body; // Assuming userId is sent in the request body for authorization

  if (!classId || !userId) {
    return res
      .status(400)
      .json({ message: "Class ID and User ID are required." });
  }

  try {
    const classRef = db.collection("classes").doc(classId);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return res.status(404).json({ message: "Class not found." });
    }

    const classData = classDoc.data();

    // Check if the requesting user is the creator of the class
    if (classData.creatorId !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this class." });
    }

    // Delete the class
    await classRef.delete();

    res.status(200).json({ message: "Class deleted successfully." });
  } catch (error) {
    console.error("Error deleting class:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Function to remove a classroom
const removeClassroom = async (req, res) => {
  const { classroomId } = req.params;
  const { userId, classID } = req.body; // userId and classID sent in the request body for authorization

  // Validate input
  if (!classroomId || !userId || !classID) {
    return res.status(400).json({
      message: "Classroom ID, Class ID, and User ID are required.",
    });
  }

  try {
    // Reference to the class document
    const classRef = db.collection("classes").doc(classID);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return res.status(404).json({ message: "Class not found." });
    }

    const classData = classDoc.data();

    // Check if the requesting user is the creator of the class
    if (classData.creatorId !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this classroom." });
    }

    // Reference to the classroom document within the class's subcollection
    const classroomRef = classRef.collection("classrooms").doc(classroomId);
    const classroomDoc = await classroomRef.get();

    if (!classroomDoc.exists) {
      return res.status(404).json({ message: "Classroom not found." });
    }

    // Delete the classroom
    await classroomRef.delete();

    res.status(200).json({ message: "Classroom deleted successfully." });
  } catch (error) {
    console.error("Error deleting classroom:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Export the new function
module.exports = {
  createClass,
  getUserClasses,
  removeClass,
  removeClassroom, // Added removeClassroom
};
