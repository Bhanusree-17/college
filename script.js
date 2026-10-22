// For local development, keep this URL. After deploying the backend, replace it
// with your backend's public URL followed by /api.
const API_BASE_URL = "https://college-1cv6.onrender.com/api";

const tableBody = document.getElementById("studentTableBody");
const searchInput = document.getElementById("searchInput");
const departmentFilter = document.getElementById("departmentFilter");
const yearFilter = document.getElementById("yearFilter");
const messageBox = document.getElementById("message");
const studentModal = document.getElementById("studentModal");
const viewModal = document.getElementById("viewModal");
const studentForm = document.getElementById("studentForm");

let students = [];
let messageTimer;

document.getElementById("todayLabel").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "short", month: "short", day: "numeric", year: "numeric"
});

function showMessage(text, type = "success") {
  clearTimeout(messageTimer);
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
  messageTimer = setTimeout(() => messageBox.classList.add("hidden"), 4500);
}

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
  } catch (error) {
    throw new Error("Cannot connect to the backend. Start the Node.js server and check API_BASE_URL.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The request failed.");
  return data;
}

async function loadStudents() {
  tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Loading student records...</td></tr>';
  try {
    const data = await apiRequest("/students");
    students = Array.isArray(data) ? data : [];
    updateStats();
    updateDepartmentOptions();
    renderStudents();
  } catch (error) {
    students = [];
    updateStats();
    tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">${escapeHtml(error.message)}</td></tr>`;
    showMessage(error.message, "error");
  }
}

function updateStats() {
  document.getElementById("totalCount").textContent = students.length;
  document.getElementById("maleCount").textContent = students.filter(s => s.gender === "Male").length;
  document.getElementById("femaleCount").textContent = students.filter(s => s.gender === "Female").length;
  document.getElementById("departmentCount").textContent = new Set(students.map(s => s.department).filter(Boolean)).size;
}

function updateDepartmentOptions() {
  const current = departmentFilter.value;
  const departments = [...new Set(students.map(s => s.department).filter(Boolean))].sort();
  departmentFilter.innerHTML = '<option value="">All departments</option>' +
    departments.map(dept => `<option value="${escapeHtml(dept)}">${escapeHtml(dept)}</option>`).join("");
  if (departments.includes(current)) departmentFilter.value = current;
}

function renderStudents() {
  const query = searchInput.value.trim().toLowerCase();
  const department = departmentFilter.value;
  const year = yearFilter.value;
  const filtered = students.filter(student => {
    const searchable = [student.name, student.rollNumber, student.email, student.department, student.phone].join(" ").toLowerCase();
    return searchable.includes(query) &&
      (!department || student.department === department) &&
      (!year || String(student.year) === year);
  });

  document.getElementById("recordSummary").textContent = `${filtered.length} student${filtered.length === 1 ? "" : "s"}`;
  if (!filtered.length) {
    tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">${students.length ? "No students match your search." : "No student records yet. Click “Add Student” to create your first record."}</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(student => {
    const initials = String(student.name || "?").trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase();
    return `<tr>
      <td><div class="student-cell"><div class="avatar">${escapeHtml(initials)}</div><div><div class="student-name">${escapeHtml(student.name)}</div><div class="student-email-sub">${escapeHtml(student.email)}</div></div></div></td>
      <td><span class="roll-tag">${escapeHtml(student.rollNumber)}</span></td>
      <td><span class="dept-tag">${escapeHtml(student.department)}</span></td>
      <td>${escapeHtml(yearLabel(student.year))}</td>
      <td>${escapeHtml(student.email)}</td>
      <td><div class="action-group">
        <button class="action-btn" title="View student" aria-label="View student" data-action="view" data-id="${student.id}">◉</button>
        <button class="action-btn" title="Edit student" aria-label="Edit student" data-action="edit" data-id="${student.id}">✎</button>
        <button class="action-btn delete" title="Delete student" aria-label="Delete student" data-action="delete" data-id="${student.id}">⌫</button>
      </div></td>
    </tr>`;
  }).join("");
}

function yearLabel(year) {
  const labels = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year" };
  return labels[year] || year || "—";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function openAddModal() {
  studentForm.reset();
  document.getElementById("studentId").value = "";
  document.getElementById("modalTitle").textContent = "Add Student";
  document.getElementById("saveBtn").textContent = "Save Student";
  studentModal.classList.remove("hidden");
  document.getElementById("name").focus();
}

function openEditModal(student) {
  studentForm.reset();
  document.getElementById("studentId").value = student.id;
  document.getElementById("modalTitle").textContent = "Edit Student";
  document.getElementById("saveBtn").textContent = "Update Student";
  ["name", "rollNumber", "email", "phone", "department", "year", "gender", "section"].forEach(key => {
    document.getElementById(key).value = student[key] ?? "";
  });
  studentModal.classList.remove("hidden");
}

function closeStudentModal() { studentModal.classList.add("hidden"); }
function closeViewModal() { viewModal.classList.add("hidden"); }

async function saveStudent(event) {
  event.preventDefault();
  const id = document.getElementById("studentId").value;
  const payload = {
    name: document.getElementById("name").value.trim(),
    rollNumber: document.getElementById("rollNumber").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    department: document.getElementById("department").value,
    year: Number(document.getElementById("year").value),
    gender: document.getElementById("gender").value,
    section: document.getElementById("section").value.trim()
  };

  const saveButton = document.getElementById("saveBtn");
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  try {
    await apiRequest(id ? `/students/${id}` : "/students", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    closeStudentModal();
    showMessage(id ? "Student updated successfully." : "Student added successfully.");
    await loadStudents();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = id ? "Update Student" : "Save Student";
  }
}

function viewStudent(student) {
  const details = [
    ["Full name", student.name], ["Roll number", student.rollNumber],
    ["Email", student.email], ["Phone", student.phone || "Not provided"],
    ["Department", student.department], ["Year", yearLabel(student.year)],
    ["Gender", student.gender || "Not provided"], ["Section", student.section || "Not provided"]
  ];
  document.getElementById("studentDetails").innerHTML = details.map(([label, value]) =>
    `<div class="detail-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
  ).join("");
  viewModal.classList.remove("hidden");
}

async function deleteStudent(student) {
  const confirmed = confirm(`Delete the record for ${student.name} (${student.rollNumber})? This cannot be undone.`);
  if (!confirmed) return;
  try {
    await apiRequest(`/students/${student.id}`, { method: "DELETE" });
    showMessage("Student deleted successfully.");
    await loadStudents();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

tableBody.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const student = students.find(item => String(item.id) === button.dataset.id);
  if (!student) return;
  if (button.dataset.action === "view") viewStudent(student);
  if (button.dataset.action === "edit") openEditModal(student);
  if (button.dataset.action === "delete") await deleteStudent(student);
});

document.getElementById("addStudentBtn").addEventListener("click", openAddModal);
document.getElementById("closeModalBtn").addEventListener("click", closeStudentModal);
document.getElementById("cancelBtn").addEventListener("click", closeStudentModal);
document.getElementById("closeViewBtn").addEventListener("click", closeViewModal);
document.getElementById("doneViewBtn").addEventListener("click", closeViewModal);
document.getElementById("refreshBtn").addEventListener("click", loadStudents);
studentForm.addEventListener("submit", saveStudent);
searchInput.addEventListener("input", renderStudents);
departmentFilter.addEventListener("change", renderStudents);
yearFilter.addEventListener("change", renderStudents);

[studentModal, viewModal].forEach(modal => modal.addEventListener("click", event => {
  if (event.target === modal) modal.classList.add("hidden");
}));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeStudentModal();
    closeViewModal();
  }
});

loadStudents();
