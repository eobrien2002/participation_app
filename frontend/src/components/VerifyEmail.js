// VerifyEmail.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "../css/HomePage.css";

const VerifyEmail = () => {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setMessage("Invalid verification link.");
        setIsError(true);
        return;
      }

      try {
        const response = await axios.get(
          `http://localhost:3000/api/verify-email?token=${token}`
        );
        if (response.data.success) {
          setMessage(response.data.message);
          setIsError(false);
        } else {
          setMessage(response.data.message);
          setIsError(true);
        }
      } catch (error) {
        console.error("Error verifying email:", error);
        setMessage(
          error.response?.data?.message ||
            "An error occurred during email verification."
        );
        setIsError(true);
      }
    };

    verify();
  }, []);

  return (
    <div className="homepage-container">
      <h1 className="section-title">Email Verification</h1>
      <div
        className={`info-container ${
          isError ? "error-container" : "success-container"
        }`}
      >
        <p className={isError ? "error-message" : "info-message"}>{message}</p>
      </div>
    </div>
  );
};

export default VerifyEmail;
