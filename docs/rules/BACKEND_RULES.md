# ICPC HUE Backend System Rules

> **CRITICAL**: These rules MUST be followed by any AI working on this codebase to maintain backend stability.

---

## 📌 Rule 1: API Routing Architecture

### The Golden Rule
```
NEVER create duplicate API routes between Express and Next.js
```

### Current Architecture (Hybrid)

| Route Pattern | Server | Port | Status |
|---------------|--------|------|--------|
| `/api/admin/*` | Express | 3001 | Legacy (Admin) |
| `/api/auth/*` | Next.js | 3000 | Migrated |
| `/api/submit-application` | Next.js | 3000 | Migrated |
| `/api/profile/*` | Next.js | 3000 | Migrated |
| `/api/get-ip` | Next.js | 3000 | Migrated |
| `/api/health` | Next.js | 3000 | Migrated |
| `/api/news/*` | Next.js | 3000 | Migrated |
| `/api/achievements` | Next.js | 3000 | Migrated |
| `/api/training-sheets/*` | Next.js | 3000 | Native |
| `/api/submissions/*` | Next.js | 3000 | Native |
| `/api/leaderboard/*` | Next.js | 3000 | Native |
| `/api/sheets/*` | Next.js | 3000 | Native |
| `/api/judge/*` | Next.js | 3000 | Native |
| `/api/stats/*` | Next.js | 3000 | Native |
| `/api/analyze-complexity` | Next.js | 3000 | Native |
| `/api/user/*` | Next.js | 3000 | Native |
| `/api/recap/*` | Next.js | 3000 | Native |
| `/api/views` | Next.js | 3000 | Native |

### Nginx Routing (MEMORIZE THIS)

```nginx
# FIRST: Specific patterns go to Next.js
location ~ ^/api/(auth|get-ip|profile|submit-application|training-sheets|submissions|leaderboard|sheets|judge|stats|analyze-complexity|user|recap|views|achievements|news|health) {
    proxy_pass http://frontend;
}

# SECOND: Everything else goes to Express (CATCH-ALL for /admin)
location /api/ {
    proxy_pass http://backend;
}
```

### Rules for Adding New APIs

1. **PREFERRED**: Add new endpoints to **Next.js** (`app/api/`).
2. **LEGACY**: Only add to Express if strictly related to legacy Admin Panel logic.
3. **If adding a NEW pattern to Next.js** → MUST update Nginx config:
   - `nginx/default.conf` (HTTP block)
   - `nginx/default.conf` (HTTPS block)

---
