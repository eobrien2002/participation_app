// controllers/classController.js
const { db, admin } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const getClassroomsCollection = (classID) => {
  return db.collection("classes").doc(classID).collection("classrooms");
};
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
          success: true,
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

// Add a new endpoint to add a student to a class
const addStudentToClass = async (req, res) => {
  const { classID } = req.params;
  const { userID } = req.body;

  if (!classID || !userID) {
    return res
      .status(400)
      .json({ message: "Class ID and User ID are required." });
  }

  try {
    const classRef = db.collection("classes").doc(classID);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return res.status(404).json({ message: "Class not found." });
    }

    // Add the student userID to the class's 'students' array or subcollection
    // If using an array:
    await classRef.update({
      students: admin.firestore.FieldValue.arrayUnion(userID),
    });

    res.status(200).json({ success: true, message: "Student added to class." });
  } catch (error) {
    console.error("Error adding student to class:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// New Function: Get User Classes as Student
const getUserClassesAsStudent = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "User ID is required." });
  }

  try {
    const classesSnapshot = await db
      .collection("classes")
      .where("students", "array-contains", userId)
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
        // Add any other relevant fields if necessary
      });
    });

    res.status(200).json({ success: true, classes });
  } catch (error) {
    console.error("Error fetching student classes:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// New Function: Get Students in a Class
const getStudentsInClass = async (req, res) => {
  const { classID } = req.params;

  if (!classID) {
    return res
      .status(400)
      .json({ success: false, message: "Class ID is required." });
  }

  try {
    const classRef = db.collection("classes").doc(classID);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found." });
    }

    const classData = classDoc.data();
    const studentIds = classData.students || [];
    // This map holds the stored sections for each student ID
    // Example: { "student123": "Section A", "studentXYZ": "Section B" }
    const studentSections = classData.studentSections || {};

    if (studentIds.length === 0) {
      return res.status(200).json({ success: true, students: [] });
    }

    // Fetch each student's user doc to get email, etc.
    const usersRef = db.collection("users");
    const studentPromises = studentIds.map((id) => usersRef.doc(id).get());
    const studentDocs = await Promise.all(studentPromises);

    // Combine user data with the student's section
    const students = studentDocs
      .filter((doc) => doc.exists)
      .map((doc) => {
        const userData = doc.data();

        return {
          id: doc.id,
          email: userData.email || "", // or userData.name, etc.
          // If we have a section stored, return it. Otherwise default to "Unassigned."
          section: studentSections[doc.id] || "Unassigned",
        };
      });

    res.status(200).json({ success: true, students });
  } catch (error) {
    console.error("Error fetching students in class:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const updateStudentSection = async (req, res) => {
  const { classID, studentID, section } = req.body;

  if (!classID || !studentID || !section) {
    return res.status(400).json({
      success: false,
      message: "classID, studentID, and section are required.",
    });
  }

  try {
    const classRef = db.collection("classes").doc(classID);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found." });
    }

    // We store the section info in a map field called 'studentSections'.
    // Example: studentSections: { studentA: "Section A", studentB: "Section B", ... }
    await classRef.update({
      [`studentSections.${studentID}`]: section,
    });

    return res.status(200).json({
      success: true,
      message: "Student section updated successfully.",
    });
  } catch (error) {
    console.error("Error updating student section:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

// Export the new function
module.exports = {
  createClass,
  getUserClasses,
  removeClass,
  removeClassroom,
  createClassroom,
  verifyClassroom,
  getUserClassrooms,
  addStudentToClass,
  getUserClassesAsStudent,
  getStudentsInClass,
  updateStudentSection,
};
