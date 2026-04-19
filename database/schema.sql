CREATE DATABASE IF NOT EXISTS task_ai_system;
USE task_ai_system;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password_hash TEXT,
  role ENUM('manager', 'employee'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assigned_by INT,
  assigned_to INT,
  title TEXT,
  description TEXT,
  deadline DATE,
  deadline_days INT,
  effort ENUM('Low','Medium','High'),
  impact ENUM('Low','Medium','High'),
  workload INT,
  category VARCHAR(50),
  status ENUM('pending','in-progress','completed') DEFAULT 'pending',
  priority_score FLOAT,
  priority_label VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id),
  CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reference_keywords (
  id INT AUTO_INCREMENT PRIMARY KEY,
  keyword VARCHAR(50),
  priority_label VARCHAR(20),
  effort VARCHAR(20),
  impact VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS task_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT,
  assigned_by INT,
  assigned_to INT,
  status ENUM('assigned','in-progress','completed','reassigned') DEFAULT 'assigned',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_task_assignments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id),
  CONSTRAINT fk_task_assignments_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE INDEX idx_task_assignments_task_status
  ON task_assignments (task_id, status, assigned_at, id);

CREATE INDEX idx_task_assignments_assigned_to_status
  ON task_assignments (assigned_to, status, updated_at, id);