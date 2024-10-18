// config/firebase.js
const admin = require("firebase-admin");
const serviceAccount = require("../classroom-participation-firebase-adminsdk-8iypo-0b4f34a3d8.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { admin, db };
