// services/emailService.js
const transporter = require("../config/mailer");

const sendVerificationEmail = async (email, token) => {
  const verificationLink = `http://localhost:3001/verify-email?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Email",
    html: `<p>Please verify your email by clicking the link below:</p>
           <a href="${verificationLink}">Verify Email</a>`,
  };

  await transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = async (email, token) => {
  const resetLink = `http://localhost:3001/reset-password?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset Request",
    html: `<p>You requested a password reset. Click the link below to set a new password:</p>
           <a href="${resetLink}">Reset Password</a>`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
