// routes/classRoutes.js
const express = require("express");
const router = express.Router();
const classController = require("../controllers/classController");

// Create Class
router.post("/create-class", classController.createClass);

// Get User Classes
router.get("/user-classes/:userId", classController.getUserClasses);

router.delete("/remove-class/:classId", classController.removeClass);
router.delete(
  "/remove-classroom/:classroomId",
  classController.removeClassroom
);

module.exports = router;
