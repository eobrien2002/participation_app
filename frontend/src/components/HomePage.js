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
  const [successMessage, setSuccessMessage] = useState("");

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

  // Updated State Variable for Role Selection
  const [role, setRole] = useState("student"); // default to student

  // New state for inviteClassID
  const [inviteClassID, setInviteClassID] = useState(null);

  // New State Variable for Name
  const [name, setName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const invitedClassID = params.get("inviteClassID");

    if (token) {
      verifyEmail(token);
    }

    if (invitedClassID) {
      setInviteClassID(invitedClassID);
    }
  }, [location.search]);

  const verifyEmail = async (token) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/verify-email?token=${token}`
      );
      setSuccessMessage(response.data.message);
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
      setRole("teacher");
      setShowSignInModal(true);
      return;
    }
    navigate(`/dashboard?userID=${user.id}&role=${user.role}`);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await axios.post("http://localhost:3000/login", {
        email,
        password,
      });
      if (response.data.success) {
        setUser(response.data.user);
        setShowSignInModal(false);

        // If inviteClassID is present, add this user to the class
        if (inviteClassID) {
          await axios.post(
            `http://localhost:3000/add-student/${inviteClassID}`,
            {
              userID: response.data.user.id,
            }
          );
        }

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
    setSuccessMessage("");

    if (role === "student" && !studentId.trim()) {
      setErrorMessage("Please provide your Student ID.");
      return;
    }

    // Include Name in Validation if Needed
    if (!name.trim()) {
      setErrorMessage("Please provide your Name.");
      return;
    }

    try {
      const payload = {
        email,
        password,
        role,
        name, // Include Name in Payload
        ...(role === "student" && { studentId }),
      };

      const response = await axios.post(
        "http://localhost:3000/register",
        payload
      );
      if (response.data.success) {
        // Assume the server returns the created user in response.data.user
        const newUser = response.data.user;
        // **Do NOT close the modal automatically on registration**
        // setShowSignInModal(false);

        setSuccessMessage(
          "Registration successful! Please check your email to verify your account."
        );

        // Reset Name Field After Successful Registration
        setName("");

        // If inviteClassID is present, add this user to the class
        if (inviteClassID && newUser && newUser.id) {
          await axios.post(
            `http://localhost:3000/classes/${inviteClassID}/add-student`,
            {
              userID: newUser.id,
            }
          );
        }
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

  const handleCloseSignInModal = () => {
    setShowSignInModal(false);
    setErrorMessage("");
    setSuccessMessage("");
    setEmail("");
    setPassword("");
    setRole("student"); // Reset role
    setStudentId("");
    setName(""); // Reset Name Field
  };

  const toggleSignInSignUp = () => {
    setIsSignIn(!isSignIn);
    setErrorMessage("");
    setSuccessMessage("");
    setEmail("");
    setPassword("");
    setRole("student");
    setStudentId("");
    setName(""); // Reset Name Field
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
            onClick={() => {
              setShowSignInModal(true);
              setRole("student");
            }}
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
          <button
            className="button-primary"
            onClick={() => {
              setShowSignInModal(true);
              setRole("student");
            }}
          >
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
            Create Classroom
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
          {/* Name Input Field - Visible Only During Registration */}
          {!isSignIn && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="input-field"
              required
            />
          )}

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

          {/* Student ID Field - shown only if role is student and user is registering */}
          {!isSignIn && role === "student" && (
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Student ID"
              className="input-field"
              required={role === "student"}
            />
          )}

          {/* Role Selection Dropdown for Registration */}
          {!isSignIn && (
            <div className="role-selection">
              <select
                id="role-dropdown"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="dropdown-select"
                required
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
          )}

          {/* Display Success Message if Available */}
          {successMessage && (
            <p className="success-message">{successMessage}</p>
          )}

          {/* Display Error Message if Available */}
          {errorMessage && <p className="error-message">{errorMessage}</p>}

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
