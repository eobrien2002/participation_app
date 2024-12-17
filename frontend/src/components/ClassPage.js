// ClassPage.js
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Modal from "react-modal";
import { FaTrash, FaEdit, FaArrowLeft } from "react-icons/fa"; // Importing necessary icons
import "../css/ClassPage.css"; // Import the standalone CSS

// Bind modal to your appElement for accessibility
Modal.setAppElement("#root");

const ClassPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const classID = params.get("classID");
  const userID = params.get("userID");
  const className = params.get("className");

  const [classrooms, setClassrooms] = useState([]);
  const [newClassroomName, setNewClassroomName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // States for Delete Confirmation Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classroomToDelete, setClassroomToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // State for Edit Mode
  const [editMode, setEditMode] = useState(false);

  // Fetch classrooms on component mount or when classID/userID changes
  useEffect(() => {
    const fetchClassrooms = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:3000/classes/${classID}/user-classrooms/${userID}`
        );
        if (response.data.success) {
          setClassrooms(response.data.classrooms);
        } else {
          setErrorMessage("Failed to load classrooms.");
        }
      } catch (error) {
        console.error("Error fetching classrooms:", error);
        setErrorMessage("Failed to fetch classrooms.");
      } finally {
        setLoading(false);
      }
    };
    if (classID && userID) {
      fetchClassrooms();
    }
  }, [classID, userID]);

  // Handle creating a new classroom
  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (!newClassroomName.trim()) {
      setErrorMessage("Classroom name cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:3000/classes/${classID}/create-classroom`,
        { name: newClassroomName, creatorId: userID, classID: classID } // Removed classID from body
      );

      // Check if the request was successful based on status code
      if (response.status === 200 || response.status === 201) {
        // Option 1: Append the newly created classroom if returned by the API
        if (response.data.classroom) {
          setClassrooms([...classrooms, response.data.classroom]);
        } else {
          // Option 2: Fetch the updated list of classrooms
          const updatedRes = await axios.get(
            `http://localhost:3000/classes/${classID}/user-classrooms/${userID}`
          );
          setClassrooms(updatedRes.data.classrooms);
        }
        setNewClassroomName("");
        setSuccessMessage("Classroom created successfully!");
      } else {
        setErrorMessage("Failed to create classroom.");
      }
    } catch (error) {
      console.error("Error creating classroom:", error);
      setErrorMessage(
        error.response?.data?.message ||
          "Failed to create classroom. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Navigate to Classroom Data Page
  const handleClassroomClick = (classroomId) => {
    navigate(`/classroom/${classroomId}?classID=${classID}&userID=${userID}`);
  };

  // Open the delete confirmation modal
  const openDeleteModal = (room) => {
    setClassroomToDelete(room);
    setIsModalOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  // Close the delete confirmation modal
  const closeDeleteModal = () => {
    setIsModalOpen(false);
    setClassroomToDelete(null);
  };

  // Handle deleting a classroom
  const handleDeleteClassroom = async () => {
    if (!classroomToDelete) return;
    setDeleteLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await axios.delete(
        `http://localhost:3000/remove-classroom/${classroomToDelete.id}`,
        { data: { userId: userID, classID } } // Include userId and classID in the request body
      );
      if (response.status === 200) {
        setClassrooms(
          classrooms.filter((room) => room.id !== classroomToDelete.id)
        );
        setSuccessMessage("Classroom deleted successfully!");
        closeDeleteModal();
      } else {
        setErrorMessage("Unexpected response from the server.");
      }
    } catch (error) {
      console.error("Error deleting classroom:", error);
      const serverError =
        error.response?.data?.message ||
        "Failed to delete classroom. Please try again.";
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

  // Navigate back to Dashboard
  const navigateBack = () => {
    navigate(`/dashboard?userID=${userID}`);
  };

  return (
    <div className="classpage-container">
      {/* Navigation Bar */}
      <header className="classpage-header">
        {/* Back Button */}
        <button
          className="classpage-back-button"
          onClick={navigateBack}
          aria-label="Go back to Dashboard"
        >
          <FaArrowLeft className="classpage-back-icon" />
          <span className="classpage-back-text">Back</span>
        </button>
        <div className="classpage-title">Class: {className}</div>
        <div className="classpage-actions">
          <button
            className={`classpage-button-edit ${editMode ? "active" : ""}`}
            onClick={toggleEditMode}
            aria-label={editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          >
            <FaEdit className="classpage-edit-icon" />
            {editMode ? "Done" : "Edit"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="classpage-main">
        {/* Classrooms Section */}
        <section className="classpage-classrooms-section">
          <h3 className="classpage-section-title">Existing Classrooms</h3>
          {loading ? (
            <div className="classpage-spinner" aria-label="Loading"></div>
          ) : classrooms.length === 0 ? (
            <p className="classpage-no-classrooms-message">
              No classrooms yet. Create one below.
            </p>
          ) : (
            <ul className="classpage-classrooms-list">
              {classrooms.map((room) => (
                <li
                  key={room.id}
                  className="classpage-classroom-card"
                  onClick={() => handleClassroomClick(room.id)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleClassroomClick(room.id);
                  }}
                >
                  <span className="classpage-classroom-name">{room.name}</span>
                  {/* Conditionally render Delete Button based on editMode */}
                  {editMode && (
                    <button
                      className="classpage-delete-button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the classroom click
                        openDeleteModal(room);
                      }}
                      aria-label={`Delete classroom ${room.name}`}
                    >
                      <FaTrash />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Create Classroom Section - Only Visible in Edit Mode */}
        {editMode && (
          <section className="classpage-create-classroom-section">
            <h3 className="classpage-section-title">Create a New Classroom</h3>
            <form
              className="classpage-create-classroom-form"
              onSubmit={handleCreateClassroom}
            >
              <input
                type="text"
                placeholder="Enter classroom name"
                value={newClassroomName}
                onChange={(e) => setNewClassroomName(e.target.value)}
                className="classpage-input-field"
                required
                aria-label="Classroom Name"
              />
              <button
                type="submit"
                className="classpage-button-primary"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Classroom"}
              </button>
            </form>
            {errorMessage && (
              <div
                className="classpage-alert-message classpage-alert-error"
                role="alert"
              >
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div
                className="classpage-alert-message classpage-alert-success"
                role="status"
              >
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
        className="classpage-modal"
        overlayClassName="classpage-modal-overlay"
        closeTimeoutMS={200} // For smooth transition
      >
        <button
          onClick={closeDeleteModal}
          className="classpage-modal-close-icon"
          aria-label="Close Modal"
        >
          &times;
        </button>
        <h2 className="classpage-modal-title">Confirm Deletion</h2>
        <p className="classpage-modal-message">
          Are you sure you want to delete the classroom "
          {classroomToDelete?.name}"? This action cannot be undone.
        </p>
        {errorMessage && (
          <div
            className="classpage-alert-message classpage-alert-error"
            role="alert"
          >
            {errorMessage}
          </div>
        )}
        <div className="classpage-modal-button-group">
          <button
            onClick={handleDeleteClassroom}
            className="classpage-button-danger"
            disabled={deleteLoading}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </button>
          <button
            onClick={closeDeleteModal}
            className="classpage-button-secondary"
            disabled={deleteLoading}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ClassPage;
