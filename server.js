// server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const app = express();
const server = http.createServer(app);

// Import configurations
const { firebase } = require("./config");

// Import routes
const authRoutes = require("./routes/authRoutes");
const classroomRoutes = require("./routes/classroomRoutes"); // Ensure this is correct
const classRoutes = require("./routes/classRoutes"); // Import classRoutes
const sseRoutes = require("./routes/sseRoutes");

// Import middleware
const errorHandler = require("./middleware/errorHandler");

// Import SSE clients
const { clients } = require("./controllers/sseController");

// Make clients accessible in app.locals for broadcasting
app.locals.clients = clients;

// Middleware
app.use(cors());
app.use(express.json());

// Use Routes
app.use("/", authRoutes);
app.use("/", classRoutes); // Mount classRoutes
app.use("/", classroomRoutes);
app.use("/", sseRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, "frontend/public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/public", "index.html"));
});

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
