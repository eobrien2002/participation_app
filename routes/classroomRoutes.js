// routes/classroomRoutes.js
const express = require("express");
const router = express.Router();
const classroomController = require("../controllers/classroomController");

// Create Classroom
router.post(
  "/classes/:classID/create-classroom",
  classroomController.createClassroom
);

// Raise Hand
router.post(
  "/classes/:classID/classrooms/:classroomId/raiseHand",
  classroomController.raiseHand
);

// Lower Hand
router.post(
  "/classes/:classID/classrooms/:classroomId/lowerHand",
  classroomController.lowerHand
);

// Select Student
router.post(
  "/classes/:classID/classrooms/:classroomId/selectStudent",
  classroomController.selectStudent
);

// Reset Queue
router.post(
  "/classes/:classID/classrooms/:classroomId/resetQueue",
  classroomController.resetQueue
);

// Log Attendance
router.post(
  "/classes/:classID/classrooms/:classroomId/log-attendance",
  classroomController.logAttendance
);

// Verify Classroom
router.post("/verify-classroom", classroomController.verifyClassroom);

// Get User Classrooms
router.get(
  "/classes/:classID/user-classrooms/:userId",
  classroomController.getUserClassrooms
);

module.exports = router;
