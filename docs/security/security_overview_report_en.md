# ICPC HUE Platform - Technical Security Audit Report

**Date:** January 4, 2026
**To:** IT Department, Horus University in Egypt (HUE)
**From:** Youssef, Lead Cybersecurity Engineer
**Subject:** Technical Infrastructure & Security Specification

---

## 1. Executive Summary

This document provides a technical deep-dive into the security architecture of the **ICPC HUE** platform (`icpchue.com`). It details the specific configurations, libraries, and logic used to secure the application stack (Next.js Frontend + Express.js Backend + PostgreSQL). The system relies on a **Defense-in-Depth** model, combining network-level blocking with application-level sanitization and encryption.

## 2. Infrastructure & Network Specification

### 2.1 TLS/SSL Configuration (Qualys A+)
*   **Protocol Support:** **TLS 1.2** and **TLS 1.3** ONLY. (SSLv2, SSLv3, TLS 1.0, TLS 1.1 Disabled).
*   **Cipher Suites:** Preferring `ECDHE-ECDSA-AES128-GCM-SHA256` and modern authenticated encryption suites.
*   **HSTS Header:** `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (Hardcoded in `helmet` config).
*   **Redirects:** Automatic 301 Redirect for HTTP -> HTTPS and 308 Redirect for WWW -> Non-WWW canonicalization.

### 2.2 DNS Security
*   **DNSSEC:** **Active** ( ECDSA P-256 signing).
*   **CAA Record:** configured to authorize `letsencrypt.org` only.

## 3. Application Security Layers

### 3.1 Edge Defense (Cloudflare WAF)
*   **Active Rulesets:** Cloudflare Managed Ruleset, OWASP ModSecurity Core Rule Set.
*   **DDoS Protection:** "Under Attack Mode" capability + automated traffic analysis.

### 3.2 Traffic Control (Rate Limiting)
Implemented via `express-rate-limit` with `trust proxy: 1` compliant with Nginx `X-Forwarded-For` headers.

| Scope | Window | Max Requests | Storage Strategy |
| :--- | :--- | :--- | :--- |
| **API Endpoints** | 15 Minutes | **300** | Memory Store (Per IP) |
| **Admin Panel** | 15 Minutes | **300** | Memory Store (Per IP) |
| **Standard UI** | 15 Minutes | **60** | Memory Store (Per IP) |

### 3.3 Request Filtering (Middleware)
*   **Bot Blocking:** Custom middleware explicitly scanning `User-Agent` headers.
    *   **Blocked Patterns:** `curl`, `wget`, `python-requests`, `scrapy`, `httpclient`, `okhttp`, `postman`.
    *   **Action:** Immediate `403 Forbidden` response for non-browser agents on API routes.
*   **CORS Policy:** Strict Whitelist (`https://icpchue.com`, `https://www.icpchue.com`).
    *   **Preflight:** `OPTIONS` requests handled separately.
    *   **Credentials:** `Access-Control-Allow-Credentials: true`.

### 3.4 Input Sanitization & Validation
*   **Sanitization Logic:** Custom regex-based filtering applied to **ALL** incoming string inputs:
    *   **HTML Strip:** `str.replace(/[<>]/g, '')`
    *   **SQL Injection Strip:** `str.replace(/['";\\]/g, '')`
    *   **Protocol Strip:** `str.replace(/javascript:/gi, '')`
    *   **Event Handler Strip:** `str.replace(/on\w+=/gi, '')`
*   **SQL Protection:** All database queries utilize **Parameterized Statements** (e.g., `$1, $2`) via `node-postgres` (`pg`) library to prevent injection.

## 4. Cryptography & Data Protection

### 4.1 Data at Rest (Database)
*   **PII Encryption:** Sensitive fields (National ID, Phone Number, Email) are **AES-256** encrypted before storage using `CryptoJS`.
*   **Password Hashing:** `bcrypt` with salt rounds (Default: 10).
*   **Database Engine:** PostgreSQL 16+ running in isolated Docker container.
*   **Row Level Security (RLS):** Enabled on sensitive tables (`login_logs`, `password_resets`) to restrict row visibility.

### 4.2 Data in Transit
*   **API Tokens:** `crypto.timingSafeEqual(Buffer, Buffer)` used for API Key string comparison to prevent side-channel timing attacks.
*   **Session Tokens:** **JWT (JSON Web Tokens)** signed with `HS256` and strictly scoped expiration (`1h` for Access, `7d` for Refresh).

## 5. Authentication Architecture

*   **Multi-Factor Authentication (MFA):**
    *   **Library:** `speakeasy` (TOTP standard, Google Authenticator compatible).
    *   **Enforcement:** Mandaory for ALL Admin routes (`/api/admin/*`).
*   **ReCAPTCHA:** Google reCAPTCHA v3.
    *   **Logic:** **Fail-Closed**. If the Google API is unreachable or verification fails in `NODE_ENV=production`, the request is **blocked**.

## 6. Access Control & Monitoring

### 6.1 Logging Strategy
*   **Login Logs:** Stored in `login_logs` table (Indexed by `user_id` and `timestamp`).
*   **Analytics:** Fingerprinting via MD5 of `(IP Address + User Agent)` to track anonymous usage without storing raw IPs permanently.
*   **PII Redaction:** Logs automatically redact email addresses and passwords before writing to `stdout`/`stderr`.

### 6.2 Header Hardening (Helmet.js)
*   `X-DNS-Prefetch-Control: off`
*   `X-Frame-Options: SAMEORIGIN`
*   `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
*   `X-Download-Options: noopen`
*   `X-Content-Type-Options: nosniff`
*   `X-XSS-Protection: 0` (Relies on CSP/Sanitization)

## 7. Sandboxing (Online Judge)
*   **Technology:** Docker Containers (Alpine Linux base).
*   **Constraints:**
    *   `--network none` (Total Air-gap).
    *   `--cpus 1.0`
    *   `--memory 256m` (Hard RAM cap).
    *   `--read-only` (Root filesystem is immutable).

## 8. Vulnerability Management
*   **Dependency Scanning:** Weekly `npm audit` checks.
*   **Malware Scans:** VirusTotal Snapshot: **0/98 (Clean)**.

## 9. Frontend Hardening (Admin & Critical Systems)

*   **Content Security Policy (CSP):**
    *   **Admin Panel:** Enforces a **Strict, Nonce-based CSP**. All scripts are cryptographically authorized per-request (`nonce-R4nd0m...`), ensuring **Zero** `unsafe-inline` usage.
    *   **Public Frontend:** Maintains a robust policy compatible with Next.js architecture, blocking unauthorized domains.
*   **Refactored Logic:** All inline event handlers (`onclick="..."`) have been removed from the Administrative Interface and replaced with **Event Listeners** to strictly separate content from behavior (Separation of Concerns).

## 10. Vulnerability Disclosure Policy

We adhere to a transparent security philosophy. As the lead Cybersecurity Engineer, I welcome any independent Security Audit from the IT Department. Use of a dedicated **Test Environment** is available.

## 11. Conclusion

The ICPC HUE platform meets and exceeds standard deployment security requirements. It poses no risk to the university's internal network. The backend infrastructure, specifically the Administrative Control Panel, operates at a **Military-Grade** security level with full air-gapping and cryptographic script authorization. isolation. We invite the IT Department to review the source code of `server/index.js` and `nginx/default.conf` for verification.

**[End of Technical Report]**

---

**Attachments Available Upon Request:**
1. Qualys SSL Labs A+ Report Screenshot
2. VirusTotal Clean Scan Report
