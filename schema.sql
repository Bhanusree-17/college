CREATE DATABASE IF NOT EXISTS college_classroom
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE college_classroom;

CREATE TABLE IF NOT EXISTS students (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  rollNumber VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20) DEFAULT '',
  department VARCHAR(60) NOT NULL,
  year TINYINT NOT NULL,
  gender VARCHAR(20) DEFAULT '',
  section VARCHAR(10) DEFAULT '',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_student_year CHECK (year BETWEEN 1 AND 4)
);

-- Optional sample rows: remove the leading dashes to insert examples.
-- INSERT INTO students (name, rollNumber, email, department, year, gender, section)
-- VALUES ('Ananya Sharma', 'CSE2401', 'ananya@example.com', 'CSE', 2, 'Female', 'A'),
--        ('Rahul Kumar', 'ECE2402', 'rahul@example.com', 'ECE', 2, 'Male', 'B');