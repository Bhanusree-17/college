require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 5000);

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5500")
  .split(",").map(origin => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("This website origin is not allowed by the backend CORS settings."));
  }
}));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", database: "disconnected", error: "Database connection failed." });
  }
});

app.get("/api/students", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, rollNumber, email, phone, department, year, gender, section, createdAt, updatedAt FROM students ORDER BY id DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("List students error:", error.message);
    res.status(500).json({ error: "Could not load student records. Check the database setup." });
  }
});

function validateStudent(body) {
  const required = ["name", "rollNumber", "email", "department"];
  for (const key of required) {
    if (typeof body[key] !== "string" || !body[key].trim()) return `${key} is required.`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return "Enter a valid email address.";
  if (![1, 2, 3, 4].includes(Number(body.year))) return "Year must be 1, 2, 3, or 4.";
  const maxLengths = { name: 100, rollNumber: 30, email: 150, phone: 20, department: 60, gender: 20, section: 10 };
  for (const [key, max] of Object.entries(maxLengths)) {
    if (body[key] != null && String(body[key]).length > max) return `${key} must be ${max} characters or fewer.`;
  }
  return null;
}

function studentValues(body) {
  return [
    body.name.trim(), body.rollNumber.trim(), body.email.trim(),
    String(body.phone || "").trim(), body.department.trim(), Number(body.year),
    String(body.gender || "").trim(), String(body.section || "").trim()
  ];
}

app.post("/api/students", async (req, res) => {
  const errorMessage = validateStudent(req.body || {});
  if (errorMessage) return res.status(400).json({ error: errorMessage });
  try {
    const [result] = await pool.execute(
      "INSERT INTO students (name, rollNumber, email, phone, department, year, gender, section) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      studentValues(req.body)
    );
    const [rows] = await pool.execute("SELECT * FROM students WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "That roll number already exists." });
    console.error("Create student error:", error.message);
    res.status(500).json({ error: "Could not save the student record." });
  }
});

app.put("/api/students/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid student ID." });
  const errorMessage = validateStudent(req.body || {});
  if (errorMessage) return res.status(400).json({ error: errorMessage });
  try {
    const [result] = await pool.execute(
      "UPDATE students SET name=?, rollNumber=?, email=?, phone=?, department=?, year=?, gender=?, section=? WHERE id=?",
      [...studentValues(req.body), id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Student not found." });
    const [rows] = await pool.execute("SELECT * FROM students WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "That roll number already exists." });
    console.error("Update student error:", error.message);
    res.status(500).json({ error: "Could not update the student record." });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid student ID." });
  try {
    const [result] = await pool.execute("DELETE FROM students WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Student not found." });
    res.json({ message: "Student deleted successfully." });
  } catch (error) {
    console.error("Delete student error:", error.message);
    res.status(500).json({ error: "Could not delete the student record." });
  }
});

app.use((error, req, res, next) => {
  if (error && error.message && error.message.includes("CORS")) {
    return res.status(403).json({ error: error.message });
  }
  console.error("Server error:", error.message);
  res.status(500).json({ error: "Unexpected server error." });
});

app.listen(PORT, () => {
  console.log(`College Classroom Manager API running at http://localhost:${PORT}`);
});