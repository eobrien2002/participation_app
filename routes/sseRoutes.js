// routes/sseRoutes.js
const express = require("express");
const router = express.Router();
const sseController = require("../controllers/sseController");

// SSE Endpoint
router.get("/events", sseController.events);

module.exports = router;
