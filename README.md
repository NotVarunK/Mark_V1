# Mark_V1 - Location-Validated Attendance System

**Mark_V1** is a modern, premium academic attendance and schedule management system. Built with a mobile-first philosophy, it features a location-validated check-in mechanism for students, a schedule constructor for administrators, and a global high-contrast dark mode theme.

---

## 🚀 Key Features

*   **Google OAuth 2.0 Integration:** Single Sign-On (SSO) for students. The backend strictly enforces that sign-ins are restricted to the official college domain (`@despu.edu.in`).
*   **Secure Single-Admin Architecture:** Admin registrations are disabled from public routes. A master administrator account is seeded securely, and administrative routes are guarded with role-based JWT middleware.
*   **Class & Schedule Management:** Admins can generate unique 6-character class codes, configure weekly schedules, pre-populate sample university timetables, and edit class details.
*   **Dynamic Student Rosters:** Admins can view nested lists of enrolled students for each class division and remove/disassociate students from a division when needed.
*   **Location-Validated Check-In:** Students check into lectures using geolocation coordinate verification with a configurable development bypass toggle (`DISABLE_GEOFENCE=true`).
*   **Interactive Student Dashboard:** Features attendance aggregate counts, subject-wise statistics, a monthly calendar view, and a built-in "Bunk Predictor" tool.
*   **Premium Visual Experience:** Fully responsive layout styled with a curated emerald-green theme and a global high-contrast black-emerald **Dark Mode** toggle.

---

## 🛠️ Technology Stack

*   **Frontend:** React (Vite), Tailwind CSS v3, Lucide Icons, `@react-oauth/google`, Axios.
*   **Backend:** Node.js, Express, Prisma ORM, PostgreSQL (Docker), JWT & signed cookie sessions, `google-auth-library`, `node-cron`.

---

## 📂 Project Structure

```text
├── backend/                  # Express API server
│   ├── prisma/               # Prisma schema and seeding scripts
│   ├── src/                  # Route handlers, middleware, cron jobs
│   └── package.json
│
├── frontend/                 # React client application
│   ├── src/                  # UI components, contexts, and pages
│   ├── tailwind.config.cjs   # Dark/Teal design configuration
│   └── package.json
│
└── docker-compose.yml        # PostgreSQL container configuration
```

---

## ⚙️ Configuration & Environment Setup

### 1. Backend Configuration
Create a `.env` file inside the `backend/` directory:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/checkin?schema=public"
JWT_SECRET="your-secure-jwt-secret-key"
DISABLE_GEOFENCE=true
GOOGLE_CLIENT_ID="646918547768-nmn9k1bai4lcmsvtq5u58p6onokulqcu.apps.googleusercontent.com"
```

### 2. Frontend Configuration
Create a `.env` file inside the `frontend/` directory:
```env
VITE_GOOGLE_CLIENT_ID="646918547768-nmn9k1bai4lcmsvtq5u58p6onokulqcu.apps.googleusercontent.com"
```

---

## 🏃 Getting Started Locally

### Step 1: Start the Database
Spin up the local PostgreSQL database mapping port `5433` using Docker:
```bash
docker compose up -d
```

### Step 2: Set up the Backend
1.  Navigate into the backend directory and install dependencies:
    ```bash
    cd backend
    npm install
    ```
2.  Run the database migrations:
    ```bash
    npx prisma migrate dev
    ```
3.  Seed the master admin account (`admin@college.edu.in` / `Admin@123`):
    ```bash
    npx prisma db seed
    ```
4.  Start the Express API server:
    ```bash
    npm run dev
    ```
    *The server runs on `http://localhost:5000`.*

### Step 3: Set up the Frontend
1.  Navigate into the frontend directory and install dependencies:
    ```bash
    cd ../frontend
    npm install
    ```
2.  Start the Vite developer server:
    ```bash
    npm run dev
    ```
    *The frontend client runs on `http://localhost:5173`.*

---

## 🧪 Testing Credentials

*   **Administrator Account (Seeded):**
    *   **Email:** `admin@college.edu.in`
    *   **Password:** `Admin@123`
*   **Student Accounts:**
    *   Sign in on the login screen using any Google Account ending in `@despu.edu.in`.
