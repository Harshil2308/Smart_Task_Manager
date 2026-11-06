# Smart Task Manager — AI-Powered Team Task Intelligence

A role-based team task management application that helps managers assign and monitor work while employees track and update their assigned tasks. The system combines a browser-based interface, a Node.js REST API, a MySQL database, and a Python machine-learning service to estimate task priority.

## Overview

Smart Task Manager is designed around two user roles:

- **Manager:** Creates tasks, assigns them to employees, reviews team tasks, edits or deletes tasks, and reassigns active work when needed.
- **Employee:** Views assigned tasks and updates their status as work progresses.

Task priority is calculated using a hybrid approach. The backend sends task attributes to a Flask prediction service and also checks task text against configurable keywords stored in MySQL. The resulting priority score and label are stored with the task.

## Features

### Authentication and Role Management
- Manager and employee registration and login.
- Password hashing using `bcryptjs`.
- JWT-based authentication with a seven-day token lifetime.
- Protected API routes using authentication and role middleware.
- Profile retrieval and updates, including optional password changes.

### Task Management
- Managers can create tasks and assign them to registered employees.
- Task details include title, description, deadline, effort, impact, workload, and category.
- Managers can view, edit, and delete tasks they created.
- Employees can view their assigned tasks and update assignment status.
- Supported assignment statuses: `assigned`, `in-progress`, `completed`, and `reassigned`.
- Managers can reassign active tasks to another employee.
- Assignment history is retained to track changes in responsibility.

### Intelligent Task Prioritization
- Flask service exposes a `/predict` endpoint for priority prediction.
- Random Forest Regressor estimates a numeric priority score.
- Random Forest Classifier predicts a priority label.
- Prediction considers deadline days, effort, impact, and workload.
- Keyword-based overrides use the `reference_keywords` MySQL table.
- Fallback prediction is available when trained model artifacts are missing or the ML service cannot be reached.

### Voice-Assisted Task Creation
- Browser-based voice capture on the manager dashboard.
- Recognized text can be sent to the backend for parsing.
- Parsing identifies task title, description, deadline phrases, and category.
- Supports relative phrases such as `today`, `tomorrow`, `next week`, and `in N days`.
- Manual task creation is also supported.

### User Interface
- Static HTML, CSS, and JavaScript frontend.
- Separate manager and employee dashboards.
- Login and registration pages.
- API helper automatically attaches the stored JWT to authenticated requests.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL, mysql2 |
| Authentication | JWT, bcryptjs |
| ML Service | Python, Flask |
| Machine Learning | scikit-learn, Random Forest |
| Data Processing | pandas, NumPy |
| Model Serialization | joblib |
| HTTP Client | Axios |

## System Architecture

```text
       ┌────────────────────────────────┐
       │        Browser Frontend        │
       │                                │
       │ HTML · CSS · JavaScript        │
       │ Login · Registration           │
       │ Manager / Employee Dashboard   │
       └───────────────┬────────────────┘
                       │
                 HTTP / JSON
                  + JWT Token
                       │
                       ▼
       ┌────────────────────────────────┐
       │       Node.js + Express        │
       │                                │
       │ Authentication                │
       │ Role Management                │
       │ Task Management                │
       │ Voice Text Parsing             │
       │ Priority Enhancement           │
       └───────────┬───────────┬────────┘
                   │           │
                   ▼           ▼
       ┌────────────────┐  ┌────────────────┐
       │     MySQL      │  │ Flask ML API   │
       │                │  │                │
       │ Users          │  │ /predict       │
       │ Tasks          │  │ Random Forest  │
       │ Assignments    │  │ Predictions    │
       │ Keywords       │  │                │
       └────────────────┘  └────────────────┘
```

## Project Structure

```text
Smart_Task_Manager/
│
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   └── db.js
│       ├── middleware/
│       │   ├── auth.js
│       │   └── roles.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── manager.js
│       │   └── tasks.js
│       └── utils/
│           ├── assignment-history.js
│           └── task-intelligence.js
│
├── database/
│   ├── schema.sql
│   └── seed_reference_keywords.sql
│
├── data/
│   └── dataset.csv
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── manager-dashboard.html
│   ├── employee-dashboard.html
│   ├── styles.css
│   └── js/
│       ├── api.js
│       ├── auth-utils.js
│       ├── config.js
│       ├── employee-dashboard.js
│       ├── login.js
│       ├── manager-dashboard.js
│       ├── navigation.js
│       └── register.js
│
├── ml-service/
│   ├── app.py
│   ├── train_model.py
│   └── requirements.txt
│
├── scripts/
│   └── check-local-setup.ps1
│
├── presentation.txt
├── running_guide.md
└── README.md
```

## Getting Started

### Prerequisites

Install the following:

- Node.js 18 or later
- npm
- Python 3.9 or later
- MySQL Server
- Chrome or Edge browser (recommended for speech recognition)

### 1. Clone the Repository

```bash
git clone https://github.com/Harshil2308/Smart_Task_Manager.git

cd Smart_Task_Manager
```

### 2. Set Up the MySQL Database

Run the database schema using your MySQL client:

```sql
SOURCE path/to/Smart_Task_Manager/database/schema.sql;
```

Optionally, insert the starter keyword rules:

```sql
SOURCE path/to/Smart_Task_Manager/database/seed_reference_keywords.sql;
```

The schema creates the `task_ai_system` database and the following tables:

| Table | Purpose |
|---|---|
| `users` | Stores manager and employee accounts |
| `tasks` | Stores task details and priority information |
| `reference_keywords` | Stores keyword-based priority rules |
| `task_assignments` | Stores employee assignments and assignment history |

The backend also verifies and creates the `task_assignments` table during startup.

### 3. Configure and Start the Backend

Open a terminal:

```bash
cd backend

npm install
```

Create your environment file by copying the example.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Update the `.env` file with your local database credentials:

```env
PORT=3000

JWT_SECRET=replace_with_a_long_random_secret

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=task_ai_system

ML_SERVICE_URL=http://localhost:5000
```

Start the backend:

```bash
npm start
```

The backend runs at:

```text
http://localhost:3000
```

### 4. Set Up and Start the ML Service

Open another terminal from the project root:

```bash
cd ml-service

python -m venv .venv
```

Activate the virtual environment.

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Train the models:

```bash
python train_model.py
```

Start the Flask service:

```bash
python app.py
```

The ML service runs at:

```text
http://localhost:5000
```

Model training generates:

- `model_score.pkl`
- `model_label.pkl`
- `encoder.pkl`

These files are loaded by the prediction endpoint.

### 5. Open the Frontend

Open the following file in your browser:

```text
frontend/index.html
```

Alternatively, open:

```text
frontend/register.html
```

The frontend API address is configured in `frontend/js/config.js`:

```javascript
window.APP_CONFIG = {
  API_BASE_URL: "http://localhost:3000/api"
};
```

Update this address when using a different backend URL.

### 6. Test the Application

1. Register a manager account.
2. Register an employee account.
3. Log in as the manager.
4. Create a task and assign it to the employee.
5. Try a task description such as `urgent client meeting tomorrow`.
6. Log in as the employee.
7. Update the assignment status to `in-progress` and then `completed`.
8. Return to the manager dashboard to review the updated task and assignment history.

## API Documentation

All backend endpoints are served from:

```text
http://localhost:3000
```

Protected endpoints require a JWT bearer token:

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

### Authentication — `/api/auth`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/register` | Register manager or employee | Public |
| POST | `/login` | Authenticate and receive JWT | Public |
| GET | `/me` | Retrieve current user profile | Authenticated |
| PUT | `/me` | Update profile and optionally password | Authenticated |

### Task Management — `/api/tasks`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/parse-voice` | Parse voice text into task fields | Manager |
| POST | `/create` | Create and assign a task | Manager |
| GET | `/` | Retrieve tasks based on user role | Authenticated |
| PUT | `/:id` | Update task details or assignment status | Authenticated, role-checked |
| DELETE | `/:id` | Delete a task created by the manager | Manager |

### Manager — `/api/manager`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/assign-task` | Forwards to task creation | Manager |
| POST | `/reassign-task` | Reassign an active task | Manager |
| GET | `/team-tasks` | Retrieve manager's tasks and assignment history | Manager |
| GET | `/employees` | Retrieve registered employees | Manager |

### Machine Learning Service

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | ML service information |
| GET | `/health` | Service and model-artifact status |
| POST | `/predict` | Predict task priority |

Example prediction request:

```json
{
  "deadline_days": 2,
  "effort": "High",
  "impact": "High",
  "workload": 7
}
```

The prediction response includes:

- `priority_score`
- `priority_label`
- `source` (`model` or `fallback`)

## How Intelligent Task Prioritization Works

The system combines machine-learning predictions with keyword-based rules.

1. The manager submits task information manually or through voice input.
2. The backend derives the number of days remaining until the deadline.
3. Task features are sent to the Flask `/predict` endpoint.
4. The Random Forest models predict a numeric priority score and priority label.
5. The backend searches the task title, description, and voice text for matching keywords in the `reference_keywords` table.
6. Matching keyword rules can increase the score and strengthen the final priority, effort, or impact.
7. The final priority information is stored with the task in MySQL.

The included CSV dataset is used by `train_model.py` to train the models.

If the model artifacts are unavailable, the Flask service uses a heuristic fallback. The Node.js backend also has a fallback prediction path when the ML service cannot be reached.

## Validation and Troubleshooting

A PowerShell setup-check script is included:

```powershell
.\scripts\check-local-setup.ps1
```

Common issues:

| Issue | Solution |
|---|---|
| MySQL connection fails | Check whether MySQL is running and verify `backend/.env` credentials. |
| Database is disconnected | Run `database/schema.sql` and verify the database name. |
| ML prediction uses fallback | Run `python train_model.py` inside `ml-service/` and check the Flask service URL. |
| Frontend cannot reach backend | Verify `frontend/js/config.js` and ensure port 3000 is available. |
| Voice input does not work | Use Chrome or Edge, allow microphone access, or enter the task manually. |

For the expanded local setup walkthrough and demonstration checklist, see [running_guide.md](running_guide.md).

## Security Notes

- Never commit your real `.env` file, database password, or production JWT secret.
- Replace the example JWT secret with a long, randomly generated value.
- Use HTTPS and configure CORS appropriately before deploying outside local development.
- Update the frontend API URL when deploying the backend.

## Current Scope

The repository includes manager and employee workflows, authentication, task assignment and reassignment history, keyword-assisted priority scoring, a separate ML prediction API, and browser voice-assisted task entry.

Deployment configuration, production hosting, and additional reporting or analytics features are not documented as implemented in the current code.

## License

No license file is currently included in this repository. Unless a license is added, standard copyright restrictions apply to reuse and redistribution.
