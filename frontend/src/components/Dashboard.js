// Dashboard.js
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Modal from "react-modal";
import { FaTrash, FaEdit, FaHome } from "react-icons/fa"; // Importing trash, edit, and home icons
import "../css/styles.css"; // Global styles
import "../css/Dashboard.css"; // Dashboard-specific styles

// Bind modal to your appElement for accessibility
Modal.setAppElement("#root");

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const userID = params.get("userID"); // Ensure userID is passed as a query parameter

  const [classes, setClasses] = useState([]);
  const [newClassName, setNewClassName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // States for Delete Confirmation Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // State for Edit Mode
  const [editMode, setEditMode] = useState(false);

  // Fetch user classes on component mount or when userID changes
  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:3000/user-classes/${userID}`
        );
        console.log("Fetch Classes Response:", response.data); // Debugging
        if (response.data.success) {
          setClasses(response.data.classes);
        } else {
          setErrorMessage("Failed to load classes.");
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
        setErrorMessage("Failed to fetch classes.");
      } finally {
        setLoading(false);
      }
    };

    if (userID) {
      fetchClasses();
    }
  }, [userID]);

  // Handle creating a new class
  const handleCreateClass = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (!newClassName.trim()) {
      setErrorMessage("Class name cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:3000/create-class", {
        name: newClassName,
        creatorId: userID,
      });
      console.log("Create Class Response:", response.data); // Debugging

      // Check HTTP status code for success
      if (response.status === 200 || response.status === 201) {
        // Assuming the API returns the created class in response.data.class
        if (response.data.class) {
          setClasses([...classes, response.data.class]);
        } else {
          // If the response does not include the class, fetch the classes again
          const updatedClasses = await axios.get(
            `http://localhost:3000/user-classes/${userID}`
          );
          setClasses(updatedClasses.data.classes);
        }
        setNewClassName("");
        setSuccessMessage("Class created successfully!");
      } else {
        // Handle unexpected success responses
        setErrorMessage("Unexpected response from the server.");
      }
    } catch (error) {
      console.error("Error creating class:", error);
      // Extract error message from response if available
      const serverError =
        error.response?.data?.message ||
        "Failed to create class. Please try again.";
      setErrorMessage(serverError);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to class detail page
  const handleClassClick = (classID) => {
    navigate(
      `/dashboard/class?classID=${classID}&userID=${userID}&className=${
        classes.find((cls) => cls.id === classID).name
      }`
    );
  };

  // Open the delete confirmation modal
  const openDeleteModal = (cls) => {
    setClassToDelete(cls);
    setIsModalOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  // Close the delete confirmation modal
  const closeDeleteModal = () => {
    setIsModalOpen(false);
    setClassToDelete(null);
  };

  // Handle deleting a class
  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    setDeleteLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await axios.delete(
        `http://localhost:3000/remove-class/${classToDelete.id}`,
        { data: { userId: userID } } // Include userId in the request body
      );
      if (response.status === 200) {
        setClasses(classes.filter((cls) => cls.id !== classToDelete.id));
        setSuccessMessage("Class deleted successfully!");
        closeDeleteModal();
      } else {
        setErrorMessage("Unexpected response from the server.");
      }
    } catch (error) {
      console.error("Error deleting class:", error);
      const serverError =
        error.response?.data?.message ||
        "Failed to delete class. Please try again.";
      setErrorMessage(serverError);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Toggle Edit Mode
  const toggleEditMode = () => {
    setEditMode(!editMode);
    setErrorMessage("");
    setSuccessMessage("");
  };

  // Navigate to Home Page
  const navigateHome = () => {
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      {/* Navigation Bar */}
      <header className="dashboard-header">
        {/* Logo Button */}
        <button
          className="logo-button"
          onClick={navigateHome}
          aria-label="Go to Home Page"
        >
          <FaHome className="logo-icon" />
        </button>
        <div className="brand-name">Quotient Dashboard</div>
        <div className="dashboard-actions">
          <button
            className={`button-edit ${editMode ? "active" : ""}`}
            onClick={toggleEditMode}
            aria-label={editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          >
            <FaEdit className="edit-icon" />
            {editMode ? "Done" : "Edit"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Classes Section */}
        <section className="classes-section">
          <h2 className="section-title">Your Classes</h2>
          {loading ? (
            <div className="spinner" aria-label="Loading"></div>
          ) : classes.length === 0 ? (
            <p className="no-classes-message">
              No classes yet. Create a new class below.
            </p>
          ) : (
            <ul className="classes-list">
              {classes.map((cls) => (
                <li
                  key={cls.id}
                  className="class-card"
                  onClick={() => handleClassClick(cls.id)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleClassClick(cls.id);
                  }}
                >
                  <span className="class-name">{cls.name}</span>
                  {/* Conditionally render Delete Button based on editMode */}
                  {editMode && (
                    <button
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the class click
                        openDeleteModal(cls);
                      }}
                      aria-label={`Delete class ${cls.name}`}
                    >
                      <FaTrash />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Create Class Section - Only Visible in Edit Mode */}
        {editMode && (
          <section className="create-class-section">
            <h2 className="section-title">Create a New Class</h2>
            <form className="create-class-form" onSubmit={handleCreateClass}>
              <input
                type="text"
                placeholder="Enter class name"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="input-field"
                required
                aria-label="Class Name"
              />
              <button
                type="submit"
                className="button-primary"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Class"}
              </button>
            </form>
            {errorMessage && (
              <div className="alert-message alert-error" role="alert">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="alert-message alert-success" role="status">
                {successMessage}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeDeleteModal}
        contentLabel="Confirm Delete"
        className="modal"
        overlayClassName="modal-overlay"
        closeTimeoutMS={200} // For smooth transition
      >
        <button
          onClick={closeDeleteModal}
          className="modal-close-icon"
          aria-label="Close Modal"
        >
          &times;
        </button>
        <h2 className="modal-title">Confirm Deletion</h2>
        <p className="modal-message">
          Are you sure you want to delete the class "{classToDelete?.name}"?
          This action cannot be undone.
        </p>
        {errorMessage && (
          <div className="alert-message alert-error" role="alert">
            {errorMessage}
          </div>
        )}
        <div className="modal-button-group">
          <button
            onClick={handleDeleteClass}
            className="button-danger"
            disabled={deleteLoading}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </button>
          <button
            onClick={closeDeleteModal}
            className="button-secondary"
            disabled={deleteLoading}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
