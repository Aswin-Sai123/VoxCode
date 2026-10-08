# VoxCode - Module 1 (Authentication + Dashboards)

VoxCode is an AI-powered technical interview and assessment platform. This repository contains the implementation of **Module 1 only**.

## 1. Project Structure
```
VoxCode/
├── backend/
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # JWT verification and RBAC
│   │   ├── models/       # Mongoose schemas (Company, Candidate, Role, RefreshToken)
│   │   ├── routes/       # Express routes
│   │   └── server.js     # Entry point
│   ├── .env
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/   # Reusable components (Navbar, ProtectedRoute)
    │   ├── context/      # React context (AuthContext)
    │   ├── pages/        # Route pages (Login, Register, Dashboards)
    │   ├── services/     # Axios API service
    │   ├── App.jsx       # Routing
    │   └── main.jsx      # Entry point
    └── package.json
```

## 2. Setup/Install Commands
Ensure you have Node.js and MongoDB installed.
```bash
# Backend setup
cd backend
npm install

# Frontend setup
cd frontend
npm install
```

## 3. Environment Variables
Copy `.env.example` to `backend/.env` and update the values:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/voxcode
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
PORT=5000
```

## 4. How to Run Frontend
```bash
cd frontend
npm run dev
```

## 5. How to Run Backend
```bash
cd backend
npm run dev
```

## 6. Database Setup
Make sure MongoDB is running locally (`mongodb://127.0.0.1:27017/voxcode`) or provide a MongoDB Atlas URI in `backend/.env`. The backend uses Mongoose to automatically create the necessary collections.

## 7. Authentication Flow
- Users (Company or Candidate) register using email and password.
- Passwords are securely hashed with `bcryptjs`.
- Upon login, the server returns a short-lived **access token (15m)** and a long-lived **refresh token (7d)**.
- Access token is sent in the `Authorization` header as `Bearer <token>`.
- Protected routes use RBAC middleware to verify the token and the user's role (COMPANY or CANDIDATE).
- Refresh tokens can be exchanged to get a new access token without re-logging in.

## 8. Google OAuth Setup
Google OAuth is a placeholder in this module (`GET /api/auth/google`). It redirects to Google's OAuth consent screen. In future modules, this callback will issue the same JWT access/refresh tokens to integrate natively with our custom authentication flow.

## 9. API Endpoints
**Auth:**
- `POST /api/auth/company/register`
- `POST /api/auth/company/login`
- `POST /api/auth/candidate/register`
- `POST /api/auth/candidate/login`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

**Company (Protected):**
- `GET /api/company/dashboard`
- `GET /api/company/profile`
- `POST /api/company/roles`
- `GET /api/company/roles`
- `PUT /api/company/roles/:id`
- `DELETE /api/company/roles/:id`

**Candidate (Protected):**
- `GET /api/candidate/dashboard`
- `GET /api/candidate/profile`

## 10. How Module 1 Connects to Future Modules
Module 1 creates the fundamental authentication and RBAC shell.
- The **Candidate and Company models** are isolated from future business logic.
- **Roles** are tied to a Company. In Module 2, these roles will be attached to Assessments.
- The **Candidate Dashboard** has a placeholder to join an assessment using an Assessment ID, which connects directly to Module 2's planned ID generation.
- **Stateless JWTs** mean future modules (e.g., Code Execution Sandbox or AI Interview microservices) only need the JWT Secret to verify identity, requiring no complex sessions.
