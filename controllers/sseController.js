// controllers/sseController.js
const { getClassroomData } = require("../services/classroomService");
const { removeStudentFromActive } = require("../services/classroomService");
const broadcastEvent = require("../utils/broadcast");
const clients = {}; // SSE clients per classroom

const events = async (req, res) => {
  const { classID, classroomId, role, userID, studentId, studentName } =
    req.query;

  console.log(
    `${role} connected to class ${classID}, classroom ${classroomId}`
  );

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send initial data
  const classroomData = await getClassroomData(classID, classroomId);
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

  // Unique key for class and classroom
  const clientKey = `${classID}_${classroomId}`;

  // Add client to the list
  if (!clients[clientKey]) {
    clients[clientKey] = [];
  }
  clients[clientKey].push(res);

  // Handle client disconnect
  req.on("close", async () => {
    console.log(
      `${role} disconnected from class ${classID}, classroom ${classroomId}`
    );
    clients[clientKey] = clients[clientKey].filter((client) => client !== res);
    try {
      const updatedActiveStudents = await removeStudentFromActive(
        classID,
        classroomId,
        userID,
        clients
      );
      broadcastEvent(
        clients,
        `${classID}_${classroomId}`,
        "attendanceUpdate",
        updatedActiveStudents
      );
    } catch (error) {
      console.error("Error removing student from active list:", error);
    }
  });
};

// Export clients for broadcasting
module.exports = {
  events,
  clients,
};
