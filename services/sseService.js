// services/sseService.js
const clients = {};

const broadcastEvent = (classroomId, event, data) => {
  if (clients[classroomId]) {
    clients[classroomId].forEach((client) => {
      client.write(`event: ${event}\n`);
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }
};

const addClient = (classroomId, res) => {
  if (!clients[classroomId]) {
    clients[classroomId] = [];
  }
  clients[classroomId].push(res);
};

const removeClient = (classroomId, res) => {
  if (clients[classroomId]) {
    clients[classroomId] = clients[classroomId].filter(
      (client) => client !== res
    );
  }
};

module.exports = {
  broadcastEvent,
  addClient,
  removeClient,
};
