// controllers/authController.js
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { db, admin } = require("../config/firebase");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/emailService");

const usersCollection = db.collection("users");

// Register a new user
const register = async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Missing email or password." });
  }

  try {
    // Check if user already exists
    const userSnapshot = await usersCollection
      .where("email", "==", email)
      .get();
    if (!userSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create verification token
    const verificationToken = uuidv4();
    const verificationTokenExpiry = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    );

    // Create new user
    const userId = uuidv4();
    await usersCollection.doc(userId).set({
      id: userId,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
      verificationTokenExpiry,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    return res.status(201).json({
      success: true,
      message:
        "User registered successfully. Please check your email to verify your account.",
      user: { id: userId, email },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ success: false, message: "Missing token." });
  }

  try {
    // Find user with the verification token
    const userSnapshot = await usersCollection
      .where("verificationToken", "==", token)
      .get();

    if (userSnapshot.empty) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token." });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Check if token is expired
    if (userData.verificationTokenExpiry.toDate() < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Token has expired." });
    }

    // Update user to verified
    await usersCollection.doc(userDoc.id).update({
      isVerified: true,
      verificationToken: admin.firestore.FieldValue.delete(),
      verificationTokenExpiry: admin.firestore.FieldValue.delete(),
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

// Login user
const login = async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Missing email or password." });
  }

  try {
    // Find user by email
    const userSnapshot = await usersCollection
      .where("email", "==", email)
      .get();
    if (userSnapshot.empty) {
      // No user found with the provided email
      return res
        .status(400)
        .json({ success: false, message: "Incorrect password or username." });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Check if email is verified
    if (!userData.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email not verified. Please check your inbox.",
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      // Password does not match
      return res
        .status(400)
        .json({ success: false, message: "Incorrect password or username." });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: { id: userData.id, email: userData.email },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  // Basic validation
  if (!email) {
    return res.status(400).json({ success: false, message: "Missing email." });
  }

  try {
    // Find user by email
    const userSnapshot = await usersCollection
      .where("email", "==", email)
      .get();
    if (userSnapshot.empty) {
      // To prevent email enumeration, respond with success even if email not found
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    const userDoc = userSnapshot.docs[0];

    // Create password reset token
    const resetToken = uuidv4();
    const resetTokenExpiry = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour
    );

    // Update user with reset token
    await usersCollection.doc(userDoc.id).update({
      passwordResetToken: resetToken,
      passwordResetTokenExpiry: resetTokenExpiry,
    });

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken);

    return res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  // Basic validation
  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Missing token or new password." });
  }

  try {
    // Find user with the reset token
    const userSnapshot = await usersCollection
      .where("passwordResetToken", "==", token)
      .get();

    if (userSnapshot.empty) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token." });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Check if token is expired
    if (userData.passwordResetTokenExpiry.toDate() < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Token has expired." });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and remove reset token
    await usersCollection.doc(userDoc.id).update({
      password: hashedPassword,
      passwordResetToken: admin.firestore.FieldValue.delete(),
      passwordResetTokenExpiry: admin.firestore.FieldValue.delete(),
    });

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  requestPasswordReset,
  resetPassword,
};
