// routes/classroomRoutes.js
const express = require("express");
const router = express.Router();
const classroomController = require("../controllers/classroomController");

// Create Classroom
router.post("/create-classroom", classroomController.createClassroom);

// Raise Hand
router.post("/raiseHand", classroomController.raiseHand);

// Lower Hand
router.post("/lowerHand", classroomController.lowerHand);

// Select Student
router.post("/selectStudent", classroomController.selectStudent);

// Reset Queue
router.post("/resetQueue", classroomController.resetQueue);

// Log Attendance
router.post("/log-attendance", classroomController.logAttendance);

// Verify Classroom
router.post("/verify-classroom", classroomController.verifyClassroom);

module.exports = router;
