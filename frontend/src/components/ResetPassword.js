// ResetPassword.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/styles.css";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (!token) {
      setMessage("Invalid password reset link.");
      setIsError(true);
      return;
    }

    setResetToken(token);
  }, [location.search]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    // Basic validation
    if (!newPassword || !confirmPassword) {
      setMessage("Please fill in all fields.");
      setIsError(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      setIsError(true);
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3000/api/reset-password",
        {
          token: resetToken,
          newPassword,
        }
      );

      if (response.data.success) {
        setMessage(response.data.message);
        setIsError(false);
        // Optionally, redirect to login after a delay
        setTimeout(() => {
          navigate("/");
        }, 3000);
      } else {
        setMessage(response.data.message);
        setIsError(true);
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      setMessage(
        error.response?.data?.message ||
          "An error occurred while resetting your password."
      );
      setIsError(true);
    }
  };

  return (
    <div className="homepage-container">
      <h1 className="homepage-title">Reset Password</h1>
      <form onSubmit={handleResetPassword} className="modal">
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter New Password"
          className="input-field"
          required
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm New Password"
          className="input-field"
          required
        />
        {message && (
          <p className={isError ? "error-message" : "info-message"}>
            {message}
          </p>
        )}
        <button type="submit" className="button-primary">
          Reset Password
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
