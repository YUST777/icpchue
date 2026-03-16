# ICPCHUE Next.js Engineering Guidelines

## 1. Tech Stack & Core Philosophy
- **Framework**: Next.js 16+ (App Router).
- **Language**: TypeScript (Strict Mode).
- **Styling**: Tailwind CSS.
- **Icons**: `lucide-react`.
- **Database**: PostgreSQL (via `pg`).
- **Authentication**: Custom JWT in `AuthContext` (Cookies + LocalStorage).

## 2. Code Quality & Typing
> **Rule #1: NO EXPLICIT `ANY` TYPES.**
- **Centralized Types**: All shared interfaces (`UserProfile`, `Submission`, `Judge0SubmissionResult`) must be defined in `lib/types.ts`.
- **Imports**: Import types directly from `@/lib/types`.
- **Props**: Explicitly type all component props. Do not use `React.FC`.

```typescript
// ✅ Good
import { UserProfile } from '@/lib/types';
export default function ProfileCard({ user }: { user: UserProfile }) { ... }

// ❌ Bad
export default function ProfileCard({ user }: any) { ... }
```

## 3. Directory Structure
- **`app/`**: Route definitions (Pages, Layouts, API Routes).
    - `api/`: Backend logic. Returns `NextResponse`.
    - `dashboard/`: Protected user routes.
- **`components/`**:
    - `dashboard/`: Widgets specific to the dashboard (e.g., `Sheet1Widget`, `ActivityCalendar`).
    - `admin/`: Admin-only components.
    - `ui/`: Reusable primitives (Buttons, Modals).
- **`lib/`**:
    - `db.ts`: Database connection pool.
    - `auth.ts`: Auth verification logic.
    - `problems.ts`: Static problem definitions & test cases.

## 4. State Management
- **Auth**: Use `useAuth()` hook from `contexts/AuthContext`.
    - accessing `user` or `profile` objects.
    - `refreshProfile()` to update data after mutations.
- **Data Fetching**:
    - Use `useEffect` for data that needs to live in client state.
    - **CRITICAL**: Always scope `async` functions *inside* `useEffect` to avoid stale closures.
    - Handle loading/error states explicitly.

## 5. Styling & Design System
- **Colors**:
    - **Primary Accent**: `#E8C15A` (Gold)
    - **Backgrounds**: `#0a0a0a` (Main), `#111` (Cards/Widgets).
    - **Text**: `text-white` (Primary), `text-gray-400` (Secondary).
- **Glassmorphism**: Use `bg-white/5` or `border-white/10` for subtle borders/backgrounds.
- **Responsive**: Mobile-first. Use `md:`, `lg:` prefixes.
    - *Example*: `text-xl md:text-2xl`.

## 6. Critical Workflows
- **Judge0 Integration**:
    - Submissions handled in `api/judge/submit`.
    - Always strictly type submission inputs/outputs `Judge0Token`.
- **File Uploads**:
    - **Path**: Use `path.join(process.cwd(), 'public', 'pfps')`.
    - **NEVER** use hardcoded absolute system paths (e.g., `/app/pfps`).
- **Security**:
    - Validate `authToken` on every protected API route using `verifyAuth(request)`.

## 7. Common Pitfalls to Avoid
1.  **Hydration Errors**: Do not use `window` or `localStorage` during initial render. Use `useEffect` or `mounted` checks.
2.  **Sync State Updates**: Do not call `setState` synchronously inside a `useEffect` (causes warning). Wrap in `setTimeout` or logical check.
3.  **Large Components**: Break down huge widgets (like `ProfilePage`) into smaller sub-components (`StatsCard`, `Heatmap`).