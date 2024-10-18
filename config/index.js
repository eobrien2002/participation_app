// config/index.js
require("dotenv").config();
const firebase = require("./firebase");
const mailer = require("./mailer");

module.exports = {
  firebase,
  mailer,
};
