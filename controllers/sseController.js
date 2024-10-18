// controllers/sseController.js
const { getClassroomData } = require("../services/classroomService");

const clients = {}; // SSE clients per classroom

const events = async (req, res) => {
  const { classroomId, role, studentId, studentName } = req.query;
  console.log(`${role} connected to classroom ${classroomId}`);

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send initial data
  const classroomData = await getClassroomData(classroomId);
  if (classroomData) {
    const data = {
      queue: classroomData.queue || [],
      attended: classroomData.attended || [],
      selectedStudent: classroomData.selectedStudent || null,
      participation: classroomData.participation || {},
      name: classroomData.name || "",
    };
    res.write(`event: initialData\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Add client to the list
  if (!clients[classroomId]) {
    clients[classroomId] = [];
  }
  clients[classroomId].push(res);

  // Handle client disconnect
  req.on("close", () => {
    console.log(`${role} disconnected from classroom ${classroomId}`);
    clients[classroomId] = clients[classroomId].filter(
      (client) => client !== res
    );
  });
};

// Export clients for broadcasting
module.exports = {
  events,
  clients,
};
