// utils/broadcast.js
function broadcastEvent(clients, classroomId, event, data) {
  if (clients[classroomId]) {
    clients[classroomId].forEach((client) => {
      client.write(`event: ${event}\n`);
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }
}

module.exports = broadcastEvent;
