// routes/classRoutes.js
const express = require("express");
const router = express.Router();
const classController = require("../controllers/classController");

// Create Class
router.post("/create-class", classController.createClass);

// Get User Classes
router.get("/user-classes/:userId", classController.getUserClasses);

// Remove Class
router.delete("/remove-class/:classId", classController.removeClass);

// Remove Classroom
router.delete(
  "/remove-classroom/:classroomId",
  classController.removeClassroom
);

// Verify Classroom
router.post("/verify-classroom", classController.verifyClassroom);

// Get User Classrooms
router.get(
  "/user-classrooms/:classID/:userId",
  classController.getUserClassrooms
);

// Create Classroom
router.post("/create-classroom/:classID", classController.createClassroom);

router.post("/add-student/:classID", classController.addStudentToClass);

router.get(
  "/user-classes-as-student/:userId",
  classController.getUserClassesAsStudent
);

router.get("/getStudentsinClass/:classID", classController.getStudentsInClass);

router.post("/update-student-section", classController.updateStudentSection);

module.exports = router;
