// HomePage.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Modal from "react-modal";
import "../css/HomePage.css";
import "../css/styles.css"; // Import general styles

Modal.setAppElement("#root");

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [joinClassroomId, setJoinClassroomId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignIn, setIsSignIn] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [classroomName, setClassroomName] = useState("");
  const [showClassroomNameInput, setShowClassroomNameInput] = useState(false);
  const [user, setUser] = useState(null);

  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (token) {
      verifyEmail(token);
    }
  }, [location.search]);

  const verifyEmail = async (token) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/verify-email?token=${token}`
      );
      setErrorMessage(response.data.message);
    } catch (error) {
      console.error("Error verifying email:", error);
      setErrorMessage(
        error.response?.data?.message ||
          "An error occurred while verifying your email."
      );
    }
  };

  const createClassroom = async () => {
    if (!user) {
      setErrorMessage("You need to sign in to create a classroom.");
      setShowSignInModal(true);
      return;
    }
    // Instead of creating a classroom here, the user will go to the dashboard to create classes.
    // Navigate to the dashboard with the userID.
    navigate(`/dashboard?userID=${user.id}`);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const response = await axios.post("http://localhost:3000/login", {
        email,
        password,
      });
      if (response.data.success) {
        setUser(response.data.user);
        setShowSignInModal(false);
        // On successful login, navigate to the dashboard
        navigate(`/dashboard?userID=${response.data.user.id}`);
      } else {
        setErrorMessage(response.data.message);
      }
    } catch (error) {
      console.error("Error during sign in:", error);
      setErrorMessage(
        error.response?.data?.message ||
          "An error occurred during sign in. Please try again."
      );
    }
  };

  const handleRegistration = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const response = await axios.post("http://localhost:3000/register", {
        email,
        password,
      });
      if (response.data.success) {
        setShowSignInModal(false);
        setErrorMessage(
          "Registration successful! Please check your email to verify your account."
        );
      } else {
        setErrorMessage(response.data.message);
      }
    } catch (error) {
      console.error("Error during registration:", error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage(
          "An error occurred during registration. Please try again."
        );
      }
    }
  };

  const openModal = () => setModalIsOpen(true);
  const closeModal = () => {
    setModalIsOpen(false);
    setErrorMessage("");
  };

  const joinClassroom = async () => {
    if (!joinClassroomId || !studentName || !studentId) {
      setErrorMessage("Please fill in all fields");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3000/verify-classroom",
        {
          classroomId: joinClassroomId,
        }
      );

      const { className, classroomName, classID } = response.data;

      navigate(`/student/${joinClassroomId}`, {
        state: { className, classroomName, classID, studentName, studentId },
      });
      closeModal();
    } catch (error) {
      setErrorMessage("Classroom ID not found. Please enter a valid ID.");
    }
  };

  const handleCloseSignInModal = () => {
    setShowSignInModal(false);
    setErrorMessage("");
    setEmail("");
    setPassword("");
  };

  const toggleSignInSignUp = () => {
    setIsSignIn(!isSignIn);
    setErrorMessage("");
    setEmail("");
    setPassword("");
  };

  const handleRequestPasswordReset = async (e) => {
    e.preventDefault();
    setResetMessage("");

    try {
      const response = await axios.post(
        "http://localhost:3000/request-password-reset",
        { email: resetEmail }
      );
      if (response.data.success) {
        setResetMessage(response.data.message);
      } else {
        setResetMessage("An error occurred. Please try again.");
      }
    } catch (error) {
      console.error("Error requesting password reset:", error);
      setResetMessage(
        error.response?.data?.message || "An error occurred. Please try again."
      );
    }
  };

  return (
    <div className="homepage-container">
      <header className="homepage-header">
        <div className="brand-name">Quotient</div>
        <div className="header-actions">
          <button
            className="button-link"
            onClick={() => setShowSignInModal(true)}
          >
            Sign Up / Log In
          </button>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Your Digital Classroom, Simplified</h1>
          <p className="hero-subtitle">
            Seamlessly connect, collaborate, and engage.
          </p>
          <button className="button-primary" onClick={openModal}>
            Join a Classroom
          </button>
        </div>
      </section>

      <section className="create-classroom-section">
        <div className="create-classroom-content">
          <h2 className="section-title">Create Your Classroom in Minutes</h2>
          <p className="section-subtitle">
            Empower your students with a streamlined, intuitive experience.
          </p>
          <button className="button-secondary" onClick={createClassroom}>
            Go to Dashboard
          </button>
        </div>
      </section>

      <section className="benefits-section">
        <div className="benefits-container">
          <div className="benefit-tile">
            <h3 className="benefit-title">Fair & Random</h3>
            <p className="benefit-description">
              Automatically select students without bias.
            </p>
          </div>
          <div className="benefit-tile">
            <h3 className="benefit-title">Real-Time Engagement</h3>
            <p className="benefit-description">
              Track participation and involvement effortlessly.
            </p>
          </div>
          <div className="benefit-tile">
            <h3 className="benefit-title">Collaborative Tools</h3>
            <p className="benefit-description">
              Encourage teamwork with integrated discussion features.
            </p>
          </div>
        </div>
      </section>

      {/* Join Classroom Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        className="modal"
        overlayClassName="modal-overlay"
      >
        <button className="modal-close-icon" onClick={closeModal}>
          &times;
        </button>
        <h2 className="modal-title">Join Classroom</h2>
        <input
          type="text"
          value={joinClassroomId}
          onChange={(e) => setJoinClassroomId(e.target.value)}
          placeholder="Classroom ID"
          className="input-field"
        />
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Your Name"
          className="input-field"
        />
        <input
          type="text"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Student ID"
          className="input-field"
        />
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <div className="modal-button-group">
          <button className="button-primary" onClick={joinClassroom}>
            Join
          </button>
        </div>
      </Modal>

      {/* Sign In / Sign Up Modal */}
      <Modal
        isOpen={showSignInModal}
        onRequestClose={handleCloseSignInModal}
        className="modal"
        overlayClassName="modal-overlay"
      >
        <button className="modal-close-icon" onClick={handleCloseSignInModal}>
          &times;
        </button>
        <h2 className="modal-title">
          {isSignIn ? "Sign In" : "Create Account"}
        </h2>
        <form onSubmit={isSignIn ? handleSignIn : handleRegistration}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="input-field"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input-field"
            required
          />
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          {resetMessage && <p className="info-message">{resetMessage}</p>}
          <div className="modal-button-group">
            <button type="submit" className="button-primary">
              {isSignIn ? "Sign In" : "Create Account"}
            </button>
            <button
              type="button"
              className="button-link-modal"
              onClick={toggleSignInSignUp}
            >
              {isSignIn
                ? "Need an account? Sign Up"
                : "Already have an account? Sign In"}
            </button>
          </div>
        </form>
        {isSignIn && (
          <div className="forgot-password">
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setShowSignInModal(false);
                setShowPasswordResetModal(true);
                setErrorMessage("");
              }}
            >
              Forgot Password?
            </button>
          </div>
        )}
      </Modal>

      {/* Classroom Name Input Modal */}
      <Modal
        isOpen={showClassroomNameInput}
        onRequestClose={() => {
          setShowClassroomNameInput(false);
          setErrorMessage("");
        }}
        className="modal"
        overlayClassName="modal-overlay"
      >
        <button
          className="modal-close-icon"
          onClick={() => setShowClassroomNameInput(false)}
        >
          &times;
        </button>
        <h2 className="modal-title">Create Classroom</h2>
        <form>
          <input
            type="text"
            value={classroomName}
            onChange={(e) => setClassroomName(e.target.value)}
            placeholder="Classroom Name"
            className="input-field"
            required
          />
          <div className="modal-button-group">
            <button type="submit" className="button-primary">
              Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Password Reset Request Modal */}
      <Modal
        isOpen={showPasswordResetModal}
        onRequestClose={() => {
          setShowPasswordResetModal(false);
          setResetMessage("");
          setResetEmail("");
        }}
        className="modal"
        overlayClassName="modal-overlay"
      >
        <button
          className="modal-close-icon"
          onClick={() => setShowPasswordResetModal(false)}
        >
          &times;
        </button>
        <h2 className="modal-title">Reset Password</h2>
        <form onSubmit={handleRequestPasswordReset}>
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="Your Email"
            className="input-field"
            required
          />
          {resetMessage && <p className="info-message">{resetMessage}</p>}
          <div className="modal-button-group">
            <button type="submit" className="button-primary">
              Send Reset Link
            </button>
          </div>
        </form>
      </Modal>

      <footer className="homepage-footer">
        <p className="footer-text">
          &copy; 2024 Quotient. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default HomePage;
