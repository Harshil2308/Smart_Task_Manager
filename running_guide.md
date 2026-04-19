# Running Guide

## Current scope

Phase 1 through Phase 4 are included here. The project now has starter services, working registration/login, JWT auth, task assignment, ML-backed priority prediction, keyword overrides, employee task updates, browser voice capture for managers, and final setup polish.

## Prerequisites

- Node.js 18+
- Python 3.9+
- MySQL Server

Python note:

- If you are using Python 3.14, use the package versions in `ml-service/requirements.txt`
- Older pinned ML package versions such as `scikit-learn==1.6.0` can fail on Python 3.14 because wheels are unavailable and `pip` tries to build from source

## Folder layout

- `backend/` - Express API
- `ml-service/` - Flask ML service
- `frontend/` - Static browser UI
- `database/` - SQL schema and seed data
- `data/` - CSV dataset for ML training

## 1. Database

Create the database and tables by running:

```sql
SOURCE path/to/database/schema.sql;
```

Optional seed keywords:

```sql
SOURCE path/to/database/seed_reference_keywords.sql;
```

Recommended order:

- Run `schema.sql`
- Run `seed_reference_keywords.sql`
- Create at least one manager and one employee through the UI after the backend starts

## 2. Backend

```bash
cd backend
npm install
npm run start
```

Create the runtime environment file first:

```bash
copy .env.example .env
```

Then update `backend/.env` with your local MySQL password.

Start the backend:

```bash
cd backend
npm start
```

Expected local URL:

- `http://localhost:3000`

Auth endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

## 3. ML service

```bash
cd ml-service
pip install -r requirements.txt
python train_model.py
python app.py
```

Expected local URL:

- `http://localhost:5000`

## 4. Frontend

Open `frontend/index.html` in the browser.

Recommended browser:

- Chrome or Edge for `webkitSpeechRecognition` support

## Current starter routes

Backend:

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/tasks/create`
- `GET /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `POST /api/tasks/parse-voice`
- `POST /api/manager/assign-task`
- `GET /api/manager/team-tasks`
- `GET /api/manager/employees`

ML service:

- `GET /health`
- `POST /predict`

## Frontend flow

- Open `frontend/register.html` to create a manager or employee account
- You will be redirected automatically to the correct dashboard
- Open `frontend/login.html` to sign back in
- Managers can create tasks manually or with browser voice input
- Employees can view their tasks and update status

## Demo checklist

1. Start MySQL.
2. Start the Flask ML service on `http://localhost:5000`.
3. Start the Node backend on `http://localhost:3000`.
4. Open `frontend/register.html` and create one manager and one employee account.
5. Sign in as manager and create a task using text input.
6. Create another task using the voice button and say something like `urgent client meeting tomorrow`.
7. Sign in as employee and update the task status.
8. Confirm the task priority and status changes appear correctly.

## Judges Demo

Use this short sequence during presentation:

1. Show backend health at `http://localhost:3000/health`.
2. Show ML health at `http://localhost:5000/health`.
3. Register a manager and an employee.
4. Create a task with `urgent client meeting tomorrow`.
5. Point out the boosted priority, effort, and impact values.
6. Log in as the employee and mark the task `completed`.

## Quick validation

Run this PowerShell helper from the repo root:

```powershell
.\scripts\check-local-setup.ps1
```

It checks for key files and tries both health endpoints.

## Troubleshooting

- If backend auth requests fail, verify `backend/.env` matches your MySQL server credentials.
- If `/health` shows `database: "disconnected"`, confirm MySQL is running and `task_ai_system` exists.
- If ML predictions fall back instead of using the model, run `python train_model.py` inside `ml-service/`.
- If voice input does not work, use Chrome or Edge and allow microphone access.
- If the frontend cannot reach the backend, confirm the API is on `http://localhost:3000`.

## Next phases

- Optional logs viewer, task filters, and workload graph
