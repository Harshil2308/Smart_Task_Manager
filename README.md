# AI-Powered Team Task Intelligence System

Local development version of a full-stack task management system with:

- Browser frontend
- Node.js + Express backend
- MySQL database
- Python Flask ML service

This repository is being built in phases. Current completed scope:

- Project structure
- Local configuration templates
- MySQL schema
- Sample ML dataset
- Minimal backend, ML, and frontend entry points
- MySQL-backed authentication
- JWT login flow
- Role-aware dashboard routing
- Task creation and assignment
- ML + keyword hybrid prioritization
- Voice-to-task capture on the manager dashboard

Current project status:

- Phase 4 polish is complete
- The codebase is ready for local setup and manual demo
- A lightweight validation script is available at [scripts/check-local-setup.ps1](/c:/Users/akhil_veq3he3/OneDrive/Desktop/Smart_Task_Manager/scripts/check-local-setup.ps1)

Quick demo flow:

- Start MySQL, the Flask ML service, and the Node backend
- Open `frontend/register.html` and create one manager and one employee
- Log in as manager and create a task such as `urgent client meeting tomorrow`
- Log in as employee and update the task status
- Show that the final priority reflects both ML prediction and keyword overrides

See [running_guide.md](/c:/Users/akhil_veq3he3/OneDrive/Desktop/Smart_Task_Manager/running_guide.md) for local setup instructions.
