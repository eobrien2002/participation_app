// HomePage.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Modal from "react-modal";
import "../css/HomePage.css";

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

  // Handle email verification if token is present in URL
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
      if (response.data.success) {
        setErrorMessage(response.data.message);
      } else {
        setErrorMessage(response.data.message);
      }
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
    setShowClassroomNameInput(true);
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
        setShowClassroomNameInput(true);
        // Clear email and password fields after successful login
        setEmail("");
        setPassword("");
      } else {
        // Display specific error message from the server
        setErrorMessage(response.data.message);
      }
    } catch (error) {
      console.error("Error during sign in:", error);
      // Display a generic error message
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
        // Display specific error message from the server
        setErrorMessage(response.data.message);
      }
    } catch (error) {
      console.error("Error during registration:", error);
      // Check if the error response exists and has a message
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setErrorMessage(error.response.data.message);
      } else {
        // Display a generic error message
        setErrorMessage(
          "An error occurred during registration. Please try again."
        );
      }
    }
  };

  const handleClassroomNameSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:3000/create-classroom",
        { name: classroomName, creatorId: user.id } // Pass creatorId if needed
      );
      navigate(`/classroom/${response.data.classroomId}`, {
        state: { classroomName },
      });
    } catch (error) {
      console.error("Error creating classroom:", error);
      setErrorMessage("Failed to create classroom. Please try again.");
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

      const { classroomName } = response.data;

      navigate(`/student/${joinClassroomId}`, {
        state: { studentName, studentId, classroomName },
      });
      closeModal();
    } catch (error) {
      setErrorMessage("Classroom ID not found. Please enter a valid ID.");
    }
  };

  // Function to handle closing the sign-in modal
  const handleCloseSignInModal = () => {
    setShowSignInModal(false);
    setErrorMessage("");
    // Optionally, clear email and password fields
    setEmail("");
    setPassword("");
  };

  // Function to toggle between sign-in and sign-up modes
  const toggleSignInSignUp = () => {
    setIsSignIn(!isSignIn);
    setErrorMessage(""); // Reset error message when switching modes
    // Optionally, clear email and password fields
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
      {/* Header with Logo and Sign Up / Login CTA */}
      <header className="homepage-header">
        <div className="logo-container">
          <img src="assets/logo.png" alt="Logo" className="logo-image" />{" "}
          {/* Logo image */}
        </div>
        <div className="cta-container">
          <button
            className="button-primary"
            onClick={() => setShowSignInModal(true)}
          >
            Sign Up / Log In
          </button>
        </div>
      </header>

      {/* Hero Section with Full-Bleed Image and Join Classroom CTA */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Join Your Classroom Today</h1>
          <p className="hero-subtitle">
            Connect, collaborate, and learn seamlessly.
          </p>
          <button className="button-primary" onClick={openModal}>
            Join a Classroom
          </button>
        </div>
      </section>

      {/* New Marketing Section for Creating a Classroom */}
      <section className="create-classroom-section">
        <div className="create-classroom-content">
          <h2 className="section-title">
            Create Your Virtual Classroom in Minutes
          </h2>
          <p className="section-subtitle">
            Empower your students with a seamless digital experience. Manage
            everything in one place, from assignments to participation tracking,
            without any hassle.
          </p>
          <button className="button-primary" onClick={createClassroom}>
            Create Your Classroom Now
          </button>
        </div>
      </section>

      {/* Three Tiles Marketing Section */}
      <section className="benefits-section">
        <div className="benefits-container">
          <div className="benefit-tile">
            <h3 className="benefit-title">Remove Bias in Student Selection</h3>
            <p className="benefit-description">
              Our platform ensures a randomized and fair method of selecting
              students for participation, removing unconscious biases from the
              equation.
            </p>
          </div>
          <div className="benefit-tile">
            <h3 className="benefit-title">Automated Participation Tracking</h3>
            <p className="benefit-description">
              Keep track of who is participating, and get instant insights into
              how engaged your students are without manually marking attendance
              or interaction.
            </p>
          </div>
          <div className="benefit-tile">
            <h3 className="benefit-title">Enhanced Collaboration Tools</h3>
            <p className="benefit-description">
              Facilitate group projects and class discussions effortlessly with
              built-in collaboration tools that make teamwork efficient and
              enjoyable.
            </p>
          </div>
        </div>
      </section>

      {/* Modal Components */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Join Classroom Modal"
        className="modal"
        overlayClassName="modal-overlay"
      >
        <button className="modal-close-icon" onClick={closeModal}>
          X
        </button>
        <h2 className="modal-title">Join Classroom</h2>
        <input
          type="text"
          value={joinClassroomId}
          onChange={(e) => setJoinClassroomId(e.target.value)}
          placeholder="Enter Classroom ID"
          className="input-field"
        />
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Enter your Name"
          className="input-field"
        />
        <input
          type="text"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Enter your Student ID"
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
        contentLabel="Sign In Modal"
        className="modal"
        overlayClassName="modal-overlay"
      >
        <button className="modal-close-icon" onClick={handleCloseSignInModal}>
          X
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
              className="button-secondary"
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
        contentLabel="Classroom Name Input"
        className="modal"
        overlayClassName="modal-overlay"
      >
        <button
          className="modal-close-icon"
          onClick={() => setShowClassroomNameInput(false)}
        >
          X
        </button>
        <h2 className="modal-title">Create Classroom</h2>
        <form onSubmit={handleClassroomNameSubmit}>
          <input
            type="text"
            value={classroomName}
            onChange={(e) => setClassroomName(e.target.value)}
            placeholder="Enter Classroom Name"
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
        contentLabel="Password Reset Modal"
        className="modal"
        overlayClassName="modal-overlay"
      >
        <button
          className="modal-close-icon"
          onClick={() => setShowPasswordResetModal(false)}
        >
          X
        </button>
        <h2 className="modal-title">Reset Password</h2>
        <form onSubmit={handleRequestPasswordReset}>
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="Enter your Email"
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

      {/* Footer */}
      <footer className="homepage-footer">
        <div className="footer-logo">
          <img src="assets/logo.png" alt="Logo" className="logo-image" />{" "}
          {/* Logo image */}
        </div>
        <p>&copy; 2024 Classroom App. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;
