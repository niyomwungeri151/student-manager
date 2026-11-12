import { useEffect, useState } from "react";
import "./App.css";

const STUDENTS_STORAGE_KEY = "student-manager.students";

const emptyStudent = {
  name: "",
  email: "",
  course: "",
  year: "1",
  photo: "",
};

function loadStudents() {
  try {
    const savedStudents = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (!savedStudents) return [];

    const parsedStudents = JSON.parse(savedStudents);
    if (!Array.isArray(parsedStudents)) {
      throw new Error("Saved student data is not a list.");
    }

    return parsedStudents.filter(
      (student) =>
        student &&
        (typeof student.id === "number" || typeof student.id === "string") &&
        typeof student.name === "string",
    );
  } catch (error) {
    console.error("Could not load saved student records.", error);
    return [];
  }
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export default function App() {
  const [students, setStudents] = useState(loadStudents);
  const [activePage, setActivePage] = useState("overview");
  const [search, setSearch] = useState("");
  const [formStudent, setFormStudent] = useState(emptyStudent);
  const [editingId, setEditingId] = useState(null);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
    } catch (error) {
      console.error("Could not save student records in this browser.", error);
    }
  }, [students]);

  const filteredStudents = students.filter((student) => {
    const query = search.trim().toLowerCase();
    return [student.name, student.email, student.course].some((value) =>
      value.toLowerCase().includes(query),
    );
  });

  function openAddForm() {
    setFormStudent({ ...emptyStudent });
    setEditingId(null);
    setPhotoError("");
    setActivePage("form");
  }

  function openEditForm(student) {
    setFormStudent({
      name: student.name,
      email: student.email,
      course: student.course,
      year: student.year,
      photo: student.photo || "",
    });
    setEditingId(student.id);
    setPhotoError("");
    setActivePage("form");
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file, such as JPG, PNG, or WebP.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setPhotoError("Please choose an image smaller than 8 MB.");
      return;
    }

    try {
      const image = await createImageBitmap(file);
      const maxDimension = 320;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");

      if (!context) {
        image.close();
        throw new Error("This browser could not prepare the image.");
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      const photo = canvas.toDataURL("image/jpeg", 0.78);
      setFormStudent((current) => ({ ...current, photo }));
      setPhotoError("");
    } catch (error) {
      console.error("Could not process the selected student photo.", error);
      setPhotoError("That photo could not be opened. Try a different image.");
    }
  }

  function saveStudent(event) {
    event.preventDefault();
    const returnPage = editingId === null ? "students" : "manage";
    const savedStudent = {
      ...formStudent,
      name: formStudent.name.trim(),
      email: formStudent.email.trim(),
      course: formStudent.course.trim(),
    };

    if (editingId !== null) {
      setStudents((current) =>
        current.map((student) =>
          student.id === editingId ? { ...student, ...savedStudent } : student,
        ),
      );
    } else {
      setStudents((current) => [
        ...current,
        { id: Date.now(), ...savedStudent },
      ]);
    }

    setActivePage(returnPage);
  }

  function deleteStudent(id) {
    setStudents((current) => current.filter((student) => student.id !== id));
  }

  const courseCount = new Set(
    students.map((student) => student.course).filter(Boolean),
  ).size;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#overview"
          onClick={(event) => {
            event.preventDefault();
            setActivePage("overview");
          }}
        >
          <span className="brand-mark">S</span>
          <span>Student<span className="brand-light">ly</span></span>
        </a>

        <div className="sidebar-label">Workspace</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={`nav-link ${activePage === "overview" ? "active" : ""}`}
            onClick={() => setActivePage("overview")}
          >
            <span className="nav-icon" aria-hidden="true">⌂</span>
            Overview
          </button>
          <button
            className={`nav-link ${activePage === "students" ? "active" : ""}`}
            onClick={() => setActivePage("students")}
          >
            <span className="nav-icon" aria-hidden="true">▤</span>
            Student directory
            <span className="nav-count">{students.length}</span>
          </button>
          <button
            className={`nav-link ${activePage === "manage" || (activePage === "form" && editingId !== null) ? "active" : ""}`}
            onClick={() => setActivePage("manage")}
          >
            <span className="nav-icon" aria-hidden="true">✎</span>
            Manage students
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon" aria-hidden="true">?</span>
            <div>
              <strong>Need a hand?</strong>
              <p>Manage your student records here.</p>
            </div>
          </div>
          <div className="profile">
            <div className="profile-avatar">AM</div>
            <div className="profile-copy">
              <strong>Admin Manager</strong>
              <span>Administrator</span>
            </div>
            <span className="profile-menu" aria-hidden="true">···</span>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>
              {activePage === "overview"
                ? "Overview"
                : activePage === "form"
                  ? editingId === null
                    ? "Add student"
                    : "Edit student"
                  : activePage === "manage"
                    ? "Manage students"
                    : "Student directory"}
            </strong>
          </div>
          <nav className="top-nav" aria-label="Page navigation">
            <button
              className={`top-nav-link ${activePage === "overview" ? "active" : ""}`}
              aria-current={activePage === "overview" ? "page" : undefined}
              onClick={() => setActivePage("overview")}
            >
              Overview
            </button>
            <button
              className={`top-nav-link ${activePage === "students" ? "active" : ""}`}
              aria-current={activePage === "students" ? "page" : undefined}
              onClick={() => setActivePage("students")}
            >
              Directory
              <span className="top-nav-count">{students.length}</span>
            </button>
            <button
              className={`top-nav-link ${activePage === "manage" || (activePage === "form" && editingId !== null) ? "active" : ""}`}
              aria-current={activePage === "manage" ? "page" : undefined}
              onClick={() => setActivePage("manage")}
            >
              Manage
            </button>
          </nav>
          <div className="topbar-right">
            <span className="today-label">Student management</span>
            <div className="topbar-avatar">AM</div>
          </div>
        </header>

        {activePage === "overview" && (
          <section className="page-content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">YOUR SCHOOL, AT A GLANCE</p>
                <h1>Overview</h1>
                <p className="page-subtitle">
                  Keep track of your students and their courses.
                </p>
              </div>
              <button className="button button-primary" onClick={openAddForm}>
                <span aria-hidden="true">＋</span> Add student
              </button>
            </div>

            <div className="stats-grid">
              <article className="stat-card">
                <div className="stat-top">
                  <span className="stat-icon purple" aria-hidden="true">♙</span>
                  <span className="stat-caption">ALL RECORDS</span>
                </div>
                <strong className="stat-value">{students.length}</strong>
                <span className="stat-description">Total students</span>
              </article>
              <article className="stat-card">
                <div className="stat-top">
                  <span className="stat-icon green" aria-hidden="true">▧</span>
                  <span className="stat-caption">LEARNING</span>
                </div>
                <strong className="stat-value">{courseCount}</strong>
                <span className="stat-description">Courses represented</span>
              </article>
              <article className="stat-card welcome-card">
                <div className="welcome-orb" aria-hidden="true">✦</div>
                <div>
                  <span className="stat-caption">QUICK TIP</span>
                  <strong className="welcome-title">Keep records up to date</strong>
                  <span className="stat-description">
                    Add a student to get started.
                  </span>
                </div>
              </article>
            </div>

            <section className="content-card recent-card">
              <div className="section-heading">
                <div>
                  <h2>Recent students</h2>
                  <p>Your latest student records</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setActivePage("students")}
                >
                  View all <span aria-hidden="true">→</span>
                </button>
              </div>

              {students.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-illustration" aria-hidden="true">＋</div>
                  <h3>No students yet</h3>
                  <p>Add your first student to see their information here.</p>
                  <button className="button button-secondary" onClick={openAddForm}>
                    Add your first student
                  </button>
                </div>
              ) : (
                <div className="student-list">
                  {[...students].slice(-5).reverse().map((student) => (
                    <StudentRow
                      key={student.id}
                      student={student}
                    />
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {(activePage === "students" || activePage === "manage") && (
          <section className="page-content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">{activePage === "manage" ? "RECORD MANAGEMENT" : "DIRECTORY"}</p>
                <h1>{activePage === "manage" ? "Manage students" : "Student directory"}</h1>
                <p className="page-subtitle">
                  {activePage === "manage"
                    ? "Edit or remove registered student records."
                    : "Browse and search registered students."}
                </p>
              </div>
              {activePage === "students" && (
                <button className="button button-primary" onClick={openAddForm}>
                  <span aria-hidden="true">＋</span> Add student
                </button>
              )}
            </div>

            <section className="content-card directory-card">
              <div className="directory-toolbar">
                <div className="directory-title">
                  <h2>{activePage === "manage" ? "Registered students" : "All students"}</h2>
                  <span className="result-count">{students.length}</span>
                </div>
                <label className="search-box">
                  <span className="search-icon" aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search students..."
                    aria-label="Search students"
                  />
                </label>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="empty-state directory-empty">
                  <div className="empty-illustration" aria-hidden="true">
                    {students.length === 0 ? "＋" : "⌕"}
                  </div>
                  <h3>{students.length === 0 ? "No students yet" : "No results found"}</h3>
                  <p>
                    {students.length === 0
                      ? "Add a student to start building your directory."
                      : "Try searching by student name, email, or course."}
                  </p>
                  {students.length === 0 && (
                    <button className="button button-secondary" onClick={openAddForm}>
                      Add student
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Course</th>
                        <th>Year</th>
                        {activePage === "manage" && (
                          <th className="actions-heading">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <div className="student-cell">
                              <StudentAvatar student={student} />
                              <div>
                                <strong>{student.name}</strong>
                                <span>{student.email || "No email added"}</span>
                              </div>
                            </div>
                          </td>
                          <td>{student.course || "—"}</td>
                          <td><span className="year-pill">Year {student.year}</span></td>
                          {activePage === "manage" && (
                            <td>
                              <div className="row-actions">
                                <button
                                  className="icon-button"
                                  onClick={() => openEditForm(student)}
                                  aria-label={`Edit ${student.name}`}
                                  title="Edit student"
                                >
                                  ✎
                                </button>
                                <button
                                  className="icon-button danger"
                                  onClick={() => deleteStudent(student.id)}
                                  aria-label={`Delete ${student.name}`}
                                  title="Delete student"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </section>
        )}

        {activePage === "form" && (
          <section className="page-content form-page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">STUDENT DIRECTORY</p>
                <h1>{editingId === null ? "Add student" : "Edit student"}</h1>
                <p className="page-subtitle">
                  {editingId === null
                    ? "Enter the details to create a student record."
                    : "Update the student information below."}
                </p>
              </div>
            </div>

            <form className="content-card student-form" onSubmit={saveStudent}>
              <div className="form-section-heading">
                <div className="form-icon" aria-hidden="true">♙</div>
                <div>
                  <h2>Student information</h2>
                  <p>Fields marked with * are required.</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="photo-field full-field">
                  <span className="photo-label">Student photo</span>
                  <div className="photo-controls">
                    <StudentAvatar
                      student={formStudent}
                      className="student-avatar photo-preview"
                    />
                    <div className="photo-actions">
                      <label className="button button-secondary photo-picker">
                        Choose photo
                        <input
                          className="photo-input"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          aria-label="Choose student photo"
                        />
                      </label>
                      {formStudent.photo && (
                        <button
                          type="button"
                          className="button button-quiet"
                          onClick={() =>
                            setFormStudent((current) => ({ ...current, photo: "" }))
                          }
                        >
                          Remove photo
                        </button>
                      )}
                      <p>JPG, PNG, or WebP. Images are resized to save space.</p>
                    </div>
                  </div>
                  {photoError && (
                    <p className="photo-error" role="alert">{photoError}</p>
                  )}
                </div>
                <label className="field full-field">
                  <span>Full name <b>*</b></span>
                  <input
                    autoFocus
                    required
                    maxLength={80}
                    value={formStudent.name}
                    onChange={(event) =>
                      setFormStudent({ ...formStudent, name: event.target.value })
                    }
                    placeholder="e.g. Alex Morgan"
                  />
                </label>
                <label className="field">
                  <span>Email address</span>
                  <input
                    type="email"
                    maxLength={120}
                    value={formStudent.email}
                    onChange={(event) =>
                      setFormStudent({ ...formStudent, email: event.target.value })
                    }
                    placeholder="alex@example.com"
                  />
                </label>
                <label className="field">
                  <span>Course or program</span>
                  <input
                    maxLength={80}
                    value={formStudent.course}
                    onChange={(event) =>
                      setFormStudent({ ...formStudent, course: event.target.value })
                    }
                    placeholder="e.g. Computer Science"
                  />
                </label>
                <label className="field">
                  <span>Year of study</span>
                  <select
                    value={formStudent.year}
                    onChange={(event) =>
                      setFormStudent({ ...formStudent, year: event.target.value })
                    }
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                    <option value="5+">Year 5+</option>
                  </select>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setActivePage(editingId === null ? "students" : "manage")}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  {editingId === null ? "Add student" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

function StudentRow({ student }) {
  return (
    <div className="recent-row">
      <div className="student-cell">
        <StudentAvatar student={student} />
        <div>
          <strong>{student.name}</strong>
          <span>{student.course || student.email || "Student record"}</span>
        </div>
      </div>
    </div>
  );
}

function StudentAvatar({ student, className = "student-avatar" }) {
  return (
    <div className={className}>
      {student.photo ? (
        <img src={student.photo} alt={`${student.name}'s profile`} />
      ) : (
        getInitials(student.name)
      )}
    </div>
  );
}
