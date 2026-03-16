# ICPC HUE Next.js - Project Knowledge Base

> **Date Generated**: 2026-01-14
> **Status**: Active / Production
> **Version**: 1.6.0+

## 1. Project Overview
**ICPCHUE-NEXT** is the modern training platform for the ICPC community (likely at Helwan University, given "HUE"). It serves as a comprehensive competitive programming dashboard, offering:
-   **Training Sheets**: Curated problem sets (Sheet 1, Sheet 2, etc.) with progressive difficulty.
-   **Online Judge**: Real-time code submission and grading (C++, Python, etc.).
-   **Leaderboards**: Live rankings based on solved problems and penalties.
-   **User Profiles**: Statistics, heatmaps, and achievement tracking (similar to Codeforces/LeetCode).
-   **Recap**: Annual performance summaries (e.g., "Recap 2025").

## 2. Technology Stack

### **Frontend & Core (Next.js)**
-   **Framework**: **Next.js 16** (App Router).
-   **Language**: **TypeScript** (Strict Mode enforced).
-   **Styling**: **Tailwind CSS v4** + `clsx` + `tailwind-merge`.
-   **UI Libraries**: 
    -   **Framer Motion** & **GSAP** for advanced animations.
    -   **Lucide React** & **React Icons** for iconography.
    -   **Recharts** for analytics and graphs.
    -   **Sooner** (likely) or similar for toasts.
-   **3D/Visuals**: **Three.js** (`@react-three/fiber`) for high-end visual effects.

### **Backend Services**
-   **Database**: **PostgreSQL** (Managed via raw SQL `schema.sql` and `pg` driver).
-   **Caching & Queues**: **Redis** (`ioredis`) + **BullMQ** (for background jobs like submission processing).
-   **Authentication**: Custom implementation using `jsonwebtoken` (JWT), `bcrypt` (hashing), and `speakeasy` (OTP/2FA).
-   **Legacy Backend**: An Express.js microservice (`express-backend`) exists on port 3001, primarily for legacy admin tasks, gradually being migrated to Next.js API routes.

## 3. Architecture & Routing

### **Hybrid Routing Strategy (Nginx)**
Traffic is handled by an Nginx reverse proxy that routes requests based on URL patterns:

1.  **Next.js (Port 3000)**: Handles the UI and *most* API routes.
    -   `/api/auth/*`
    -   `/api/judge/*`
    -   `/api/training-sheets/*`
    -   `/api/user/*`
    -   `/api/leaderboard/*`
2.  **Express (Port 3001)**: Legacy/Admin fallback.
    -   `/api/admin/*`
    -   `/api/*` (Catch-all for undefined Next.js routes).

### **Directory Structure (`next-app/`)**
-   **`app/`**: Next.js App Router (Pages, Layouts, API Endpoints).
    -   `api/`: Backend endpoints (e.g., `api/judge/submit/route.ts`).
    -   `dashboard/`: Main platform application (protected routes).
-   **`components/`**: React components.
    -   `dashboard/`: heavy widgets (e.g., `IdentityCard`, `ActivityCalendar`).
    -   `admin/`: Management interfaces.
-   **`lib/`**: Core Singletons & Logic.
    -   `db.ts`: PostgreSQL connection pool.
    -   `auth.ts`: Authentication verification helpers.
    -   `problems.ts`: Problem definitions, metadata, and validation logic.
    -   `queue.ts`: BullMQ queue setup.
    -   `redis.ts`: Redis connection.
    -   `types.ts`: **Source of Truth** for TypeScript interfaces.

## 4. Key Workflows

### **A. Authentication**
-   **Login**: `/api/auth/login` → Validates credentials → Issues JWT (HTTP-only cookie).
-   **Verification**: Middleware (`middleware.ts` or `lib/auth.ts`) validates the JWT on protected routes.
-   **Role-Based Access**: Users have roles (`trainee`, `mentor`, `admin`) stored in the `users` table.

### **B. Problem Solving (Judge)**
1.  **Submission**: User submits code via `SubmissionsTab.tsx`.
2.  **API**: POST to `/api/judge/submit`.
3.  **Validation**: Backend validates input, rate limits (via Redis), and checks constraints.
4.  **Processing**: 
    -   Immediate execution (if light) via `Judge0` or internal isolation.
    -   OR Enqueue into BullMQ for async processing.
5.  **Feedback**: Result (Accepted, Wrong Answer, TLE) is stored in `training_submissions` and pushed back to the client.

### **C. Leaderboards**
-   Aggregates data from `training_submissions` locally.
-   May fetch external data from Codeforces via `lib/codeforces.ts` to sync user ratings and solve counts.
-   Cached via Redis to prevent high DB load.

## 5. Database Schema (Key Tables)
*(See `system_rules/schema_reference.sql` for full DDL)*

-   **`users`**: Core profile data, auth hashes, CF handles.
-   **`applications`**: Student registration details (Faculty, National ID).
-   **`training_submissions`**: The "log" of all code attempts. Contains `source_code`, `verdict`, `time_ms`, etc.
-   **`problem_test_cases`**: Test inputs/outputs for local problems (Sheet 1, etc.).
-   **`recap_2025`**: Static/Generated stats for the yearly recap feature.
-   **`user_achievements`**: Gamification records.

## 6. Development Rules & Standards

### **TypeScript**
-   **Strict usage of `lib/types.ts`**: Do not inline interfaces for core entities.
-   **NO `any`**: Explicitly type all API responses and component props.

### **Styling & UI**
-   **Mobile-First**: Design for small screens first using Tailwind's `md:` and `lg:` breakpoints.
-   **Theme**: Dark mode default (`#0a0a0a`), Gold Accents (`#E8C15A`).

### **Security**
-   **Environment Variables**: Never commit `.env`.
-   **Validation**: Validate all API inputs (Zod or manual checks) before hitting the DB.
-   **Rate Limiting**: Applied to submission and auth endpoints.

## 7. Deployment
-   **Docker**: The app is containerized (`Dockerfile.frontend`, `Dockerfile.backend`).
-   **Orchestration**: `docker-compose.yml` manages the Next.js app, Express app, Redis, and Postfix (Mail).
-   **Nginx**: Serves as the gateway and SSL terminator.
