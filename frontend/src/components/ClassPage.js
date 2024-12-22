// ClassPage.js
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Modal from "react-modal"; // Ensure Modal is imported
import copy from "copy-to-clipboard";
import { FaTrash, FaEdit, FaArrowLeft, FaUserPlus } from "react-icons/fa";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"; // <-- NEW import
import "../css/ClassPage.css";

// Bind modal to your appElement for accessibility
Modal.setAppElement("#root");

const ClassPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const classID = params.get("classID");
  const userID = params.get("userID");
  const className = params.get("className");
  const role = params.get("role");
  const studentId = params.get("studentId");
  const studentName = params.get("studentName");

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

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const inviteLink = `${window.location.origin}?inviteClassID=${classID}`;

  // State for Students (Added for Teachers)
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");

  // New States for Join Classroom Feature
  const [joinClassroomId, setJoinClassroomId] = useState("");
  const [joinErrorMessage, setJoinErrorMessage] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // ---- NEW: Track sections for Drag and Drop ----
  const [sections, setSections] = useState({
    "Section A": [],
    "Section B": [],
    "Section C": [],
    Unassigned: [],
  });

  // Fetch classrooms on component mount or when classID/userID changes
  useEffect(() => {
    const fetchClassrooms = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:3000/user-classrooms/${classID}/${userID}`
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

  // Fetch students if the role is teacher
  useEffect(() => {
    const fetchStudents = async () => {
      setStudentsLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:3000/getStudentsinClass/${classID}`
        );
        if (response.data.success) {
          setStudents(response.data.students);
        } else {
          setStudentsError("Failed to load students.");
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        setStudentsError("Failed to fetch students.");
      } finally {
        setStudentsLoading(false);
      }
    };
    if (classID && role === "teacher") {
      fetchStudents();
    }
  }, [classID, role]);

  // ---- NEW: Once 'students' is loaded, distribute them into sections.
  //      For simplicity, let's assume each student has a "section" property.
  useEffect(() => {
    if (!studentsLoading && students.length > 0) {
      const newSections = {
        "Section A": [],
        "Section B": [],
        "Section C": [],
        Unassigned: [],
      };

      students.forEach((student) => {
        // Suppose each student object has a 'section' property
        const assignedSection = student.section;
        if (assignedSection === "Section A") {
          newSections["Section A"].push(student);
        } else if (assignedSection === "Section B") {
          newSections["Section B"].push(student);
        } else if (assignedSection === "Section C") {
          newSections["Section C"].push(student);
        } else {
          newSections["Unassigned"].push(student);
        }
      });

      setSections(newSections);
    }
  }, [students, studentsLoading]);

  // ---- NEW: Handle Drag End ----
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    // If the user drops outside of any droppable zone => move to "Unassigned"
    if (!destination) {
      const sourceSection = source.droppableId;
      const draggedStudent = sections[sourceSection].find(
        (s) => s.id === draggableId
      );

      // Remove from the old array
      const newSourceArray = sections[sourceSection].filter(
        (s) => s.id !== draggableId
      );

      // Insert into Unassigned
      const newUnassignedArray = [...sections["Unassigned"], draggedStudent];

      setSections((prev) => ({
        ...prev,
        [sourceSection]: newSourceArray,
        Unassigned: newUnassignedArray,
      }));
      return;
    }

    // If dropping in the same section but different index:
    if (destination.droppableId === source.droppableId) {
      const sectionStudents = Array.from(sections[source.droppableId]);
      const [movedStudent] = sectionStudents.splice(source.index, 1);
      sectionStudents.splice(destination.index, 0, movedStudent);

      setSections((prev) => ({
        ...prev,
        [source.droppableId]: sectionStudents,
      }));
    } else {
      // Dropping into a different section
      const sourceStudents = Array.from(sections[source.droppableId]);
      const [movedStudent] = sourceStudents.splice(source.index, 1);

      const destinationStudents = Array.from(sections[destination.droppableId]);
      destinationStudents.splice(destination.index, 0, movedStudent);

      setSections((prev) => ({
        ...prev,
        [source.droppableId]: sourceStudents,
        [destination.droppableId]: destinationStudents,
      }));
    }
  };

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
        `http://localhost:3000/create-classroom/${classID}`,
        { name: newClassroomName, creatorId: userID, classID: classID }
      );

      if (response.status === 200 || response.status === 201) {
        if (response.data.classroom) {
          setClassrooms([...classrooms, response.data.classroom]);
        } else {
          // Fetch the updated list of classrooms
          const updatedRes = await axios.get(
            `http://localhost:3000/user-classrooms/${classID}/${userID}`
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
        { data: { userId: userID, classID } }
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

  const openInviteModal = () => setShowInviteModal(true);
  const closeInviteModal = () => setShowInviteModal(false);

  const copyInviteLink = () => {
    copy(inviteLink);
    alert("Invite link copied to clipboard!");
  };

  // Handle joining a classroom (for students)
  const joinClassroom = async () => {
    if (!joinClassroomId.trim()) {
      setJoinErrorMessage("Please enter a Classroom ID.");
      return;
    }

    setJoinLoading(true);
    setJoinErrorMessage("");
    try {
      const response = await axios.post(
        "http://localhost:3000/verify-classroom",
        {
          classroomId: joinClassroomId.trim(),
        }
      );

      if (response.data.success) {
        const { className, classroomName, classID: newClassID } = response.data;

        navigate(`/student/${joinClassroomId.trim()}`, {
          state: {
            className,
            classroomName,
            classID: newClassID,
            studentId,
            studentName,
            userID,
          },
        });
      } else {
        setJoinErrorMessage(
          response.data.message || "Failed to join classroom."
        );
      }
    } catch (error) {
      console.error("Error joining classroom:", error);
      setJoinErrorMessage(
        error.response?.data?.message ||
          "Classroom ID not found. Please enter a valid ID."
      );
    } finally {
      setJoinLoading(false);
    }
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
          {role === "teacher" && (
            <>
              <button
                className={`classpage-button-edit ${editMode ? "active" : ""}`}
                onClick={toggleEditMode}
                aria-label={editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
              >
                <FaEdit className="classpage-edit-icon" />
                {editMode ? "Done" : "Edit"}
              </button>
              <button
                className="classpage-button-invite"
                onClick={openInviteModal}
                aria-label="Invite Students"
              >
                <FaUserPlus className="classpage-invite-icon" />
                Invite Students
              </button>
            </>
          )}
          {role === "student" && null /* no button for students */}
        </div>
      </header>

      {/* Main Content */}
      <main className="classpage-main">
        {/* Existing Classrooms Section - Only Visible to Teachers */}
        {role === "teacher" && (
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
                    <span className="classpage-classroom-name">
                      {room.name}
                    </span>
                    {editMode && (
                      <button
                        className="classpage-delete-button"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent classroom-click
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
        )}

        {/* Create Classroom Section - Only Visible in Edit Mode and to Teachers */}
        {role === "teacher" && editMode && (
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

        {/* Students Section - Only Visible to Teachers */}
        {role === "teacher" && (
          <section className="classpage-students-section">
            <h3 className="classpage-section-title">Students in this Class</h3>
            {studentsLoading ? (
              <div className="classpage-spinner" aria-label="Loading"></div>
            ) : studentsError ? (
              <p className="classpage-error-message">{studentsError}</p>
            ) : students.length === 0 ? (
              <p className="classpage-no-students-message">
                No students enrolled in this class yet.
              </p>
            ) : (
              // ---- NEW: Replace simple list with DnD columns
              <div className="classpage-dnd-container">
                <DragDropContext onDragEnd={handleDragEnd}>
                  {/* Top row: Section A, Section B, Section C */}
                  <div className="classpage-dnd-row">
                    {["Section A", "Section B", "Section C"].map(
                      (sectionKey) => (
                        <Droppable droppableId={sectionKey} key={sectionKey}>
                          {(provided, snapshot) => (
                            <div
                              className={`classpage-dnd-column ${
                                snapshot.isDraggingOver
                                  ? "classpage-dnd-column-over"
                                  : ""
                              }`}
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                            >
                              <h4>{sectionKey}</h4>
                              {sections[sectionKey].map((student, index) => (
                                <Draggable
                                  key={student.id}
                                  draggableId={student.id}
                                  index={index}
                                >
                                  {(providedDraggable, snapshotDraggable) => (
                                    <div
                                      className={`classpage-dnd-item ${
                                        snapshotDraggable.isDragging
                                          ? "classpage-dnd-item-dragging"
                                          : ""
                                      }`}
                                      ref={providedDraggable.innerRef}
                                      {...providedDraggable.draggableProps}
                                      {...providedDraggable.dragHandleProps}
                                    >
                                      {student.email || "Unnamed Student"}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      )
                    )}
                  </div>

                  {/* Below row: Unassigned */}
                  <div className="classpage-dnd-unassigned">
                    <Droppable droppableId="Unassigned">
                      {(provided, snapshot) => (
                        <div
                          className={`classpage-dnd-column ${
                            snapshot.isDraggingOver
                              ? "classpage-dnd-column-over"
                              : ""
                          }`}
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          <h4>Unassigned</h4>
                          {sections["Unassigned"].map((student, index) => (
                            <Draggable
                              key={student.id}
                              draggableId={student.id}
                              index={index}
                            >
                              {(providedDraggable, snapshotDraggable) => (
                                <div
                                  className={`classpage-dnd-item ${
                                    snapshotDraggable.isDragging
                                      ? "classpage-dnd-item-dragging"
                                      : ""
                                  }`}
                                  ref={providedDraggable.innerRef}
                                  {...providedDraggable.draggableProps}
                                  {...providedDraggable.dragHandleProps}
                                >
                                  {student.email || "Unnamed Student"}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </DragDropContext>
              </div>
            )}
          </section>
        )}

        {/* Join Classroom Section - Only Visible to Students */}
        {role === "student" && (
          <section className="classpage-join-classroom-section">
            <h3 className="classpage-section-title">Join Classroom</h3>
            <form
              className="classpage-join-classroom-form"
              onSubmit={(e) => {
                e.preventDefault();
                joinClassroom();
              }}
            >
              <input
                type="text"
                value={joinClassroomId}
                onChange={(e) => setJoinClassroomId(e.target.value)}
                placeholder="Enter Classroom ID"
                className="classpage-input-field"
                required
                aria-label="Classroom ID"
              />
              <button
                type="submit"
                className="classpage-button-primary"
                disabled={joinLoading}
              >
                {joinLoading ? "Joining..." : "Join"}
              </button>
            </form>
            {joinErrorMessage && (
              <div
                className="classpage-alert-message classpage-alert-error"
                role="alert"
              >
                {joinErrorMessage}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {role === "teacher" && (
        <Modal
          isOpen={isModalOpen}
          onRequestClose={closeDeleteModal}
          contentLabel="Confirm Deletion"
          className="classpage-modal"
          overlayClassName="classpage-modal-overlay"
          closeTimeoutMS={200}
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
      )}

      {/* Invite Modal */}
      {role === "teacher" && (
        <Modal
          isOpen={showInviteModal}
          onRequestClose={closeInviteModal}
          contentLabel="Invite Students"
          className="classpage-modal"
          overlayClassName="classpage-modal-overlay"
          closeTimeoutMS={200}
        >
          <button
            onClick={closeInviteModal}
            className="classpage-modal-close-icon"
            aria-label="Close Modal"
          >
            &times;
          </button>
          <h2 className="classpage-modal-title">Invite Students</h2>
          <p className="classpage-modal-message">
            Share the link below with students. When they sign up or sign in,
            they will be added to this class:
          </p>
          <input
            type="text"
            readOnly
            value={inviteLink}
            className="classpage-input-field"
          />
          <div className="classpage-modal-button-group">
            <button
              onClick={copyInviteLink}
              className="classpage-button-primary"
            >
              Copy Link
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ClassPage;
