// routes/classroomRoutes.js
const express = require("express");
const router = express.Router();
const classroomController = require("../controllers/classroomController");

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

router.get(
  "/classes/:classID/dashboard",
  classroomController.getClassDashboard
);

router.get(
  "/classes/:classID/students/:userID/dashboard",
  classroomController.getStudentDashboard
);

module.exports = router;
