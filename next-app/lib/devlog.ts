export interface LogEntry {
    id: number;
    version_short: string;
    category: string;
    date: string;
    title: string;
    subtitle: string;
    description: string;
    content?: string;
    highlights?: string[];
    media?: {
        type: 'image' | 'pdf';
        src: string;
        alt: string;
        caption?: string;
    }[];
}

export const devLogs: LogEntry[] = [
    {
        id: 9,
        version_short: "v3.1",
        category: "REGISTRATION",
        date: "2026-03-16",
        title: "Unified Streamlined Registration",
        subtitle: "Goodbye Forms, Hello One-Step Entry",
        description: "We've listened to your feedback! The registration process has been completely redesigned to be faster, more secure, and integrated directly into the platform—eliminating external forms forever.",
        content: `# We Heard You—Registration is Now Easier!

Due to past registration bottlenecks, we've officially retired external forms. Registration is now a unified experience directly on our platform! 🔥

👉 **[icpchue.com/register](https://icpchue.com/register)**

### Get Started in Seconds:
1. **Tutorial Video**: 🎬 **[Watch the full Sign Up/In Tutorial](https://youtu.be/mhcmiVfol90)**
2. **Horus Email**: Enter your official Horus university email and create a password.
3. **OTP Verification**: You'll receive a One-Time Password (OTP) via email. *(Note: Check your Spam or Trash folders if it doesn't appear in your Inbox)*.
4. **Complete Profile**: Fill in your basic details (Name, College, etc.) and you're in!

You're now ready to solve problems, watch curriculum videos, and track your achievements in real-time.

---

## 👕 The Thursday Event Promise!
We haven't forgotten our word! As announced during our Thursday event...

The **top performers** who complete the training sheets will be rewarded with an exclusive **ICPC HUE Logo T-Shirt**! 🤫

Show us what the beasts of programming can do! Let the competition begin! 🚀🔥`,
        highlights: [
            "Unified Registration System",
            "OTP-based Email Verification",
            "Removal of External Forms",
            "Incentive: Exclusive ICPC HUE T-Shirts"
        ],
        media: []
    },
    {
        id: 8,
        version_short: "v3.0",
        category: "RELEASE",
        date: "2026-02-09",
        title: "Platform Maturity & Content Expansion",
        subtitle: "The 650-Problem Milestone & Extension Launch",
        description: "ICPC HUE reaches a massive milestone with the completion of our 650-problem curriculum and the official introduction of Verdict Helper, a revolutionary browser extension for a unified Codeforces workflow.",
        content: `<p align="center">
  <a href="https://icpchue.com/">
    <img src="/devlog/v3-banner.jpg" alt="ICPC HUE Banner" width="100%">
  </a>
</p>

# ICPCHUE v3.0
*February 9, 2026*

## Platform Maturity & Content Expansion

### The 650-Problem Milestone
The core vision for ICPCHUE's curriculum is officially complete. The platform now hosts a massive, structured database of **650 comprehensive problems**, taking students from absolute beginners to professional competitive programmers. 

To ensure a smooth learning curve, the curriculum is formally divided into three distinct tiers:
* **Level 0 (Language Fundamentals):** Dedicated entirely to mastering the syntax of your chosen programming language, whether that is C++, Python, or others. It builds the mechanical foundation needed before diving into logic.
* **Level 1 (Core Problem Solving):** The official introduction to competitive programming. This level shifts the focus from syntax to algorithmic thinking and contest-style questions.
* **Level 2 (Advanced Application):** Professional-level challenges designed to test complex data structures and advanced algorithms.

With the core architecture and curriculum established, the primary development phase for ICPCHUE is finalized. Our engineering efforts moving forward will be strictly dedicated to bug fixes, performance optimization, and maintaining platform stability.

---

## Introducing Verdict Helper
*Transforming the Competitive Programming Workflow*

While ICPCHUE serves as our training ground, Codeforces remains the global arena. However, managing multiple tabs—problems, submit pages, and status lists—breaks focus and costs precious seconds during a contest. 

To solve this, we are introducing **[Verdict Helper](https://chromewebstore.google.com/detail/verdict-helper/jeiffogppnpnefphgpglagmgbcnifnhj)**, a Chrome extension that connects the powerful Verdict.run platform directly to Codeforces, creating a unified, high-performance environment.

### Key Extension Features:
* **Unified Workflow:** Read problem statements, write code, and check results in a single, streamlined window, eliminating the need for constant tab switching.
* **Embedded VS Code Editor:** Access a full-featured coding experience with autocomplete and modern development tools without ever leaving the problem page.
* **Instant Test Runner:** Bypass the Codeforces judge queue during testing. The built-in local judge runs sample cases instantly, allowing for rapid debugging and iteration before committing a final answer.
* **Built-in Whiteboard:** Sketch ideas, draw graphs, and visualize algorithms directly alongside the problem statement.
* **Smart One-Click Submission:** Submit directly to Codeforces securely and quickly. The extension automatically handles Gym auto-joining and provides smart error reporting.
* **Analytics & History:** Track your performance with detailed submission history and speed analytics.

Stop waiting on loading screens. Start solving. You can add the extension from the Chrome Web Store today.`,
        highlights: [
            "650+ Problems Added",
            "Multi-tiered Curriculum",
            "Verdict Helper Extension Launch",
            "Stability & Fixes Phase Begins"
        ],
        media: [
            { type: 'image', src: '/devlog/v3-banner.jpg', alt: 'ICPC HUE v3.0 Banner' }
        ]
    },
    {
        id: 7,
        version_short: "v2.2",
        category: "INTERFACE",
        date: "2026-01-11",
        title: "Interface Modernization & Feature Expansion",
        subtitle: "Dashboard & Mobile Optimization",
        description: "A major UI overhaul focusing on usability and aesthetics. Introduced a refined dashboard layout with a collapsible sidebar, new notification system, and enhanced profile widgets for instant progress tracking. Mobile experience has been significantly improved with a new responsive side panel.",
        content: `# UI/UX REFINEMENT: ELEVATING THE USER EXPERIENCE

On January 11, we rolled out a comprehensive update to the specialized interface, focusing on maximizing screen real estate and improving navigation flow on both desktop and mobile devices.

### 1. Dashboard Evolution v2.2
The dashboard received a significant facelift to reduce clutter and focus on content.

*   **Collapsible Sidebar**: Introduced a "mini-mode" sidebar that collapses to icons-only, giving users 20% more horizontal space for coding and problem-solving.
*   **Global Header Integrated**: Unified header design across all sub-pages ensuring consistent navigation and branding context.
*   **Notification System**: Implemented a real-time notification drop-down to keep students updated on system announcements and feedback without leaving their workflow.

## 2. Profile Insights
We enhanced the profile page to serve as a better command center for students.

*   **New "Sheet-1" Widget**: A dedicated progress tracker for the introductory sheet, giving immediate visual feedback on completion status.
*   **Global Rank Widget**: A real-time leaderboard position display, motivating students to climb the ranks.

## 3. Mobile Optimization
Recognizing the need for on-the-go access, we completely rebuilt the mobile navigation.

*   **Responsive Side Panel**: Replaced the standard hamburger menu with a smooth, gesture-supporting side drawer that provides full access to navigation without obstructing the main view.`,
        highlights: [],
        media: []
    },
    {
        id: 6,
        version_short: "v2.1",
        category: "SECURITY",
        date: "2026-01-05",
        title: "Hardened Security Infrastructure",
        subtitle: "Audit & Hardening",
        description: "During an intensive development period, we prioritized comprehensive security measures, mitigating potential vulnerabilities and implementing robust Security Headers to protect all users. Following external auditing and an A+ SSL certification, multiple evaluations confirmed our adherence to OWASP security standards.",
        content: `Building a platform for hundreds of developers requires a focus on security by design.We implemented a hardened security infrastructure following a ** Defense -in-Depth ** model, achieving an ** A + SSL Rating ** from Qualys SSL Labs and meeting strict ** OWASP Top 10 ** compliance standards.

** Global Security Certifications:**

* ** Qualys SSL Labs **: Grade A + with verified TLS 1.3 implementation and perfect forward secrecy
    * ** ImmuniWeb AI **: Grade A + with PCI DSS 4.0.1 and NIST compliance
        * ** Internet.nl **: 96 % score confirming IPv6, DNSSEC, and RPKI compliance
            * ** VirusTotal **: 0 / 98 Clean across all 98 security vendors
                * ** DNSSEC Debugger **: Secure chain with cryptographic proof of domain authenticity

                    ** Technical Architecture:**

                        Our hybrid architecture combines Next.js 16(React 19) for server - side rendering with a hardened Express.js backend, PostgreSQL 16 + database, and TypeScript for type - safety across the entire stack.

** Defense -in -Depth Security Layers:**

* ** Nonce - Based CSP **: Dynamic Content Security Policy using cryptographic nonces (\`crypto.randomBytes(16)\`) for script validation, preventing any unauthorized JavaScript execution and eliminating XSS attack vectors.
* **Google reCAPTCHA v3**: Invisible bot protection with score-based verification (minimum threshold 0.5) on all form submissions, blocking automated attacks while maintaining seamless UX for legitimate users.
* **Enhanced XSS Protection**: Multi-layer sanitization with HTML entity encoding, script tag stripping, and event handler removal. All user inputs are sanitized through \`sanitizeInput()\` function before storage and display.
* **Row-Level Security (RLS)**: PostgreSQL tables protected with RLS policies on \`password_resets\`, \`login_logs\`, \`problem_test_cases\`, \`user_achievements\`, \`page_views\`, and \`view_logs\`, ensuring data isolation at the database level with granular access control.
* **DDoS Shielding**: Cloudflare WAF provides Layer 7 protection combined with intelligent rate-limiting middleware (\`express-rate-limit\`) that throttles abusive traffic signatures while keeping the API responsive for legitimate users.
* **Bot Mitigation**: Custom middleware blocks automated scrapers and malicious bots (curl, wget, python-requests, scrapy) while allowing legitimate search engine crawlers, protecting API endpoints from abuse.
* **Zero-Trust Auth**: Stateless **JWT** (JSON Web Tokens) with 1-day expiration combined with **Bcrypt** high-iteration password hashing (salt rounds optimized for security), ensuring credentials never touch the database in plain text.
* **SQL Injection-Proof**: All database interactions use parameterized queries via the \`pg\` driver with prepared statements, making injection attacks mathematically impossible. Continuous automated testing validates protection.
* **Edge Protection**: Cloudflare CDN and WAF block malicious traffic patterns before they reach our infrastructure, with automatic DDoS mitigation and geographic filtering.
* **DNS Security**: Full **DNSSEC** implementation on \`icpchue.com\` prevents DNS cache poisoning attacks, with **CAA records** restricting certificate issuance to authorized providers only.
* **Judge0 Sandboxing**: Our code execution engine runs on **Judge0**, a battle-tested sandboxed environment that isolates each submission in its own secure container with syscall filtering, preventing any malicious code from accessing the host system or network.
* **Code Execution Isolation**: Student code runs in fully isolated **Docker (Alpine Linux) containers** with \`--network none\` flag (zero internet access), \`--read-only\` filesystems for immutability, and strict CPU (1.0) and memory limits (<256MB) to prevent DoS attacks and resource exhaustion.
* **TLS Enforcement**: Locked to **TLS 1.2+ and TLS 1.3** only with **HSTS** (HTTP Strict Transport Security, max-age 31536000, includeSubDomains, preload) forcing all connections through encrypted channels with perfect forward secrecy.
* **Encryption at Rest**: Sensitive PII is encrypted using **AES-256** (CryptoJS) before storage, with secure key management.
* **Input Sanitization**: Multi-layer validation with strict type checking, length limits (name: 100 chars, email: 255 chars, ID: 7 digits), regex patterns, URL validation (\`sanitizeUrl()\` blocks \`javascript:\` URIs), and HTML entity encoding on both client and server sides to prevent injection attacks.
* **Session Security**: Automatic session expiry (1-day JWT lifetime), secure cookie flags (\`HttpOnly\`, \`Secure\`, \`SameSite=Strict\`), and CSRF token validation on all state-changing operations.
* **CORS Hardening**: Strict origin validation with explicit allowlist (\`icpchue.com\` only), preflight request handling, and credential-based requests properly scoped.
* **Security Headers**: Full Helmet.js implementation with \`X-Frame-Options: DENY\`, \`X-Content-Type-Options: nosniff\`, \`Referrer-Policy: strict-origin-when-cross-origin\`, and \`Permissions-Policy\` restrictions.
* **Audit Trails**: All sensitive operations (login attempts, code submissions, data modifications) are logged with user fingerprints, timestamps, IP addresses, and PII redaction for security review, compliance, and automated plagiarism auditing.
* **PostgreSQL Hardening**: Multi-layer database security with SSL/TLS encrypted connections, connection pooling with strict limits to prevent resource exhaustion, automated table initialization with RLS policies, persistent data volumes for durability, and regular automated backups with point-in-TIME recovery. Database runs in isolated Docker container with no external network access except through the backend API.
* **Automated Security Testing**: Continuous penetration testing suite (\`security-test.js\`) validates XSS protection, SQL injection prevention, CSRF tokens, authentication flows, path traversal attacks, and database security with comprehensive test coverage.

This audit was a thorough evaluation to ensure that all submissions, grades, and user data remain secure. The platform is designed to provide a high-performance educational environment while maintaining strict security protocols.`,
        media: [
            { type: 'pdf', src: '/devlog/ICPC-HUE-Platform-Technical-Security.pdf', alt: 'Security Audit Report', caption: 'Full Security Audit Report (PDF)' },
            { type: 'image', src: '/devlog/sec1.webp', alt: 'UpGuard Security Score', caption: 'Verify: https://www.upguard.com/instant-security-score/report?c=icpchue.com' },
            { type: 'image', src: '/devlog/sec2.webp', alt: 'Internet.nl Compliance', caption: 'Verify: https://internet.nl/site/icpchue.com/3650384/#control-panel-13' },
            { type: 'image', src: '/devlog/sec3.webp', alt: 'ImmuniWeb SSL Security A+', caption: 'Verify: https://www.immuniweb.com/ssl/icpchue.com/FEeGjwJa/' },
            { type: 'image', src: '/devlog/sec4.webp', alt: 'Mozilla Observatory Report', caption: 'Verify: https://developer.mozilla.org/en-US/observatory/analyze?host=icpchue.com' },
            { type: 'image', src: '/devlog/sec5.webp', alt: 'Hardenize Security Report', caption: 'Verify: https://securityheaders.com/?q=icpchue.com&followRedirects=on' },
            { type: 'image', src: '/devlog/sec6.webp', alt: 'DNSViz DNSSEC Visualization', caption: 'Verify: https://dnsviz.net/d/icpchue.com/dnssec/' },
            { type: 'image', src: '/devlog/sec7.webp', alt: 'Verisign DNSSEC Debugger', caption: 'Verify: https://dnssec-debugger.verisignlabs.com/icpchue.com' }
        ]
    },
    {
        id: 5,
        version_short: "v2.0",
        category: "RECAP",
        date: "2025-12-31",
        title: "2025 Development Review",
        subtitle: "Key Achievements",
        description: "We concluded 2025 by consolidating our development efforts into a stable and professional technical platform. This documentation serves as a practical demonstration of the project's evolution from its initial development stages.",
        content: `# 2025 STATISTICAL RECAP: ENGINEERING IMPACT

As 2025 comes to a close, we look back on the metrics that defined ICPC HUE's transition from a student initiative into a high-performance educational ecosystem. Since our launch on November 28, 2025, the platform has processed thousands of sessions and established a significant digital footprint in the national tech community.

---

### I. TECHNICAL ARCHITECTURE & PERFORMANCE

We bypassed ready-made tools to develop a custom-built infrastructure designed to mirror systems used by global tech giants.

* **Proprietary Online Judge (OJ)**: We engineered a custom compiler and grading engine to provide sub-second feedback. The interface was specifically designed for educational clarity, displaying Input, Expected Output, and Student Result side-by-side to assist in debugging logical errors.
* **Unique Debugging UI**: Unlike standard judges, our platform features a smart interface displaying the Input, Expected Output, and Student Result side-by-side, allowing for total clarity in understanding logical errors.
* **Enterprise-Grade Security**:
  * **SSL/TLS Encryption**: Full end-to-end encryption for all user data.
  * **Cloudflare Scrape Shield**: Protection against automated data theft and scrapers.
  * **AI Crawl Control**: Proprietary judge logic and problem sets are restricted from AI bot indexing to maintain academic integrity.
* **Performance & SEO**: Maintains a lightning-fast average load time of 1,395ms. Ranked as the #1 search result for university-specific technical queries, driving 880 organic direct hits.
* **System Versatility**: Supporting 600+ mobile users and 410+ desktop users across Android, Windows, and Linux.

---

### II. PROGRESS REPORT: MILESTONES & TIMELINE

We have maintained a rigorous development and training schedule to meet student needs.

* **Launch (Nov 28, 2025)**: Platform registration opened; secured 300+ student registrations within days.
* **Admission & Filter Phase (Dec 7 – Dec 12, 2025)**: Due to high demand (250+ applications in 48 hours), we implemented a mandatory 3-session training and admission exam.
* **Kickoff Live Session (Dec 7, 2025)**: Attended by 160+ students.
* **Training Camps (Dec 7 – Dec 20, 2025)**: Successfully conducted the "Approval Camp" and the "Winter Camp".
* **"Programming 1" Exam Rescue (Jan 1 – Jan 2, 2026)**: Strategically delivered intensive review sessions, including a full curriculum revision and a live "Zatouna" session for problem-solving tricks.

---

### III. ACADEMIC IMPACT: LEVEL 1 SPECIALIZATION

A core mission was ensuring Level 1 students mastered the transition from syntax to algorithmic logic.

* **The "Solving 15" Mastery Framework**: In specialized sessions (Session 6), students solved 15 diverse problems in a single sitting to bridge the gap between theory and practical coding.
* **Curriculum Roadmap**: Training spanned from basic Data Types and Control Flow to Computational Complexity utilizing Big O and Space analysis.
* **Content Archive**: All sessions are permanently archived with high-quality recordings, allowing students to study at their own pace.

---

### IV. QUANTITATIVE IMPACT (ADMIN & WEB ANALYTICS)

Internal analytics from the icpchue.com dashboard confirm deep engagement within the faculty.

#### A. Platform Engagement Metrics

| Metric | Statistic |
| --- | --- |
| Total Logins | 273 |
| Unique Logged-in Users | 32 |
| Page Views (30 Days) | 3,840+ |
| Unique Visitors | 1,050+ |

#### B. Community Demographics

* **Level Distribution**: Level 1 (50%) | Level 2 (50%) (18 vs 19 students).
* **Gender Parity**: 52% Female | 48% Male (19 Female / 18 Male).
* **International Reach**: Traffic recorded from Egypt (920), USA (90), Saudi Arabia (10), and China (10).

#### C. Leaderboard Highlights (Top Problem Solvers)

| Rank | Student Name | Solved | Submissions |
| --- | --- | --- | --- |
| 1 | امل حامد | 26 | 88 |
| 2 | Mostafa | 10 | 55 |
| 3 | Moustafa Elassal | 9 | 31 |

---

### V. SOCIAL INFLUENCE & INDUSTRY REACH

* **Facebook Viral Reach**: Generated 7,000+ views across all community posts, raising the Faculty of AI's profile.
* **LinkedIn Professional Reach**: Project updates reached 4,002 members and generated 6,789 impressions.
* **Industry Validation**: Engagement came primarily from Software Engineers and Developers in Cairo and Giza.
* **Video Mastery**: 1,910 video views with 10 hours 41 minutes of total watch time.

---

### VI. FINAL CONCLUSION

ICPC HUE is a technical powerhouse. We have built the tools, the security, and the community to make Horus University a leader in software engineering. With a custom-built, SEO-optimized, and highly secured infrastructure, we are not just teaching code; we are building the future of the Faculty of AI.`,
        media: [
            { type: 'pdf', src: '/devlog/icpchue-dec-report3.pdf', alt: 'December 2025 Monthly Report', caption: 'December Technical Performance & Security Report (PDF)' },
            { type: 'image', src: '/devlog/recap4.webp', alt: 'Security Recap 4' },
            { type: 'image', src: '/devlog/recap1.webp', alt: 'Security Recap 1' }
        ]
    },
    {
        id: 4,
        version_short: "v1.3",
        category: "JUDGE",
        date: "2025-12-25",
        title: "Developing the Custom Execution Engine",
        subtitle: "Technical Implementation",
        description: "To support our specific training requirements, we developed a dedicated code execution engine from scratch. This system now hosts more than 26 problems and provides precise progress tracking for all users. It is a comprehensive system optimized for our educational objectives, offering a robust foundation for the training environment.",
        content: `Standard training platforms often lack the granular data needed to track specific educational milestones. To address this, we developed a custom execution engine to support our training sheets, providing students with a professional-grade environment for technical development.

**Engine Architecture:**

Our judge is built on a high-performance execution engine, integrated into our infrastructure to provide sub-second grading and absolute consistency across submissions.

**Security & Isolation:**

* **Sandboxed Execution**: Every submission is executed in a fully isolated **Docker (Alpine Linux)** container. We enforce strict resource limits—specifically 1.0 CPU units and <256MB of RAM—to prevent denial-of-service attacks and ensure stability.
* **Network Lockdown**: All execution containers are started with the \`--network none\` flag. This ensures that student code has zero internet access, preventing any potential data leaks or unauthorized external communication.
* **Read-Only File Systems**: Containers are mounted with read-only filesystems, preventing malicious scripts from modifying the host environment or leaving persistent footprints.

**Grading & Data:**

* **Custom Test Cases**: We manually curated over 100+ test cases across 26 distinct problems in **Sheet-1**, covering edge cases from integer overflows to complex graph topologies. Our system provides detailed feedback for each case (WA, TLE, MLE, RE).
* **Real-Time Progress**: Submissions are graded asynchronously. As soon as a result is finalized, it's pushed to our global leaderboard via an optimized update pipeline, allowing students to track their progress relative to the cohort.
* **Internal Data Tracking**: Unlike public platforms, we track every attempt by every student. This allows our instructors to see exactly where students are struggling—whether it's on specific time limits or algorithmic complexity—and adjust our curriculum accordingly.

**Conclusion:**

The execution system has transformed from a production-ready tool. By building our own execution layer, we've created a training environment that provides a precision instrument for academic growth. It scales seamlessly as we add new training sheets, providing a reliable platform for the next generation of developers at HUE.`,
        media: [
            { type: 'image', src: '/devlog/sheet1.webp', alt: 'Sheet 1 Launch' },
            { type: 'image', src: '/devlog/leader.webp', alt: 'Leaderboard' },
            { type: 'image', src: '/devlog/problempage.webp', alt: 'Problem Page' }
        ]
    },
    {
        id: 3,
        version_short: "v1.2",
        category: "DASHBOARD",
        date: "2025-12-10",
        title: "Dashboard Implementation",
        subtitle: "Integrated Platform infrastructure",
        description: "Following a period of intensive development, we transitioned from a minimal problem set to a full-featured student hub. This included implementing a secure registration system with JWT authentication and Bcrypt hashing, while ensuring the interface remains intuitive and accessible for all users.",
        content: `The launch of the Approval Camp marked a critical turning point for ICPCHUE. What began as a simple list of three problems quickly demanded a more sophisticated architecture. We embarked on an intensive development cycle to transform a basic landing page into a comprehensive student hub—the Dashboard.

**Architecting the Student Hub:**

Our objective was to centralize the training experience. We needed a secure environment where students could manage their profiles, track their progress, and access learning materials without friction.

**Technical Foundation:**

* **Secure Authentication Flow**: We implemented a robust authentication system utilizing **JWT (JSON Web Tokens)** for stateless session management. Password security was ensured through **Bcrypt** hashing with high salt rounds, protecting user credentials at rest.
* **Database Integration**: We migrated to a structured **PostgreSQL** schema to handle user profiles, submission history, and achievement data. This allowed for complex relational queries that power the personalized dashboard experience.
* **State Management**: Using modern React hooks, we developed a responsive state management layer that syncs user data across the platform in real-time, ensuring that as soon as a student solves a problem, their progress is reflected instantly.

**Enhancing the User Experience:**

* **Integrated Learning Materials**: We added a dedicated session library featuring video tutorials and technical guides, ensuring students have the resources they need directly within their workspace.
* **Achievement System**: To drive engagement, we began developing an achievement system. This included the initial integration of 3D models and progress markers that visualize a student's growth throughout the camp.
* **Persistent User Profiles**: The dashboard introduced the concept of a persistent identity, where students can showcase their CodeForces and LeetCode statistics alongside their internal progress.

**Conclusion:**

This development phase was more than just adding features; it was about building the infrastructure that supports a community of hundreds of developers. By focusing on a secure and intuitive hub early on, we ensured that the platform could scale effortlessly as the complexity of our training sheets increased.`,
        media: [
            { type: 'image', src: '/devlog/dashbaord.webp', alt: 'Dashboard View' },
            { type: 'image', src: '/devlog/profile.webp', alt: 'Profile View' },
            { type: 'image', src: '/devlog/devlog.webp', alt: 'DevLog Early Version' }
        ]
    },
    {
        id: 2,
        version_short: "v1.1",
        category: "IDENTITY",
        date: "2025-11-30",
        title: "Custom Registration System",
        subtitle: "Authentication & Verification",
        description: "We opted to develop a dedicated internal registration system to maintain full control over user data. This enabled us to implement a secure multi-stage verification process, which has successfully processed over 300 applications to date.",
        content: `While third-party form builders offer convenience, they lack the granular control and security required for a production-grade recruitment process. For ICPCHUE's first recruitment phase, we engineering a custom registration system from the ground up to ensure data sovereignty and technical flexibility.

**Why Custom over Third-Party?**

* **Data Sovereignty**: By hosting our own registration database, we maintain absolute control over sensitive student information, ensuring it's never shared with or processed by external marketing or storage platforms.
* **Custom Verification Logic**: Standard forms couldn't handle the multi-stage verification we envisioned. We implemented a custom handshake that validates academic IDs and university emails before allowing a submission.
* **Integrated UX**: Keeping the user on our domain during the entire application process builds trust and provides a seamless professional experience.

**Technical Implementation:**

* **Email OTP System**: We integrated a secure email verification flow using **NodeMailer**. Applicants receive a time-sensitive One-Time Password (OTP) that must be verified before the registration form is submitted, effectively eliminating bot-driven spam and ensuring email validity.
* **Input Validation & Sanitization**: Utilizing rigorous server-side validation, we ensure all data—from Codeforces profiles to National IDs—meets our strict schema requirements. This prevents malformed data from entering our pipeline.
* **Database Architecture**: Applications are stored in a dedicated PostgreSQL table with optimized indexing for rapid retrieval during the review phase. This allowed our recruitment team to filter and sort hundreds of applications with sub-second latency.

**Impact & Scaling:**

The system successfully handled a surge of over 300 applications within the first recruitment window. By building this ourselves, we laid the groundwork for the more complex authentication and dashboard systems that followed. It proved that taking the 'hard way' early on—building custom instead of using shortcuts—is essential for creating a professional technical ecosystem.`,
        media: [
            { type: 'image', src: '/devlog/frompage.webp', alt: 'Custom Registration Form' },
            { type: 'image', src: '/devlog/formlanding.webp', alt: 'Form Landing Page' }
        ]
    },
    {
        id: 1,
        version_short: "v1.0",
        category: "GENESIS",
        date: "2025-11-27",
        title: "Refining the Visual Identity",
        subtitle: "Design Evolution",
        description: "The project's visual identity underwent a significant refactor to establish a professional and modern interface. Initial development focused on establishing a robust UI/UX foundation, incorporating modern design elements to define the platform's unique characteristics before backend implementation began.",
        content: `Every great project starts with a single line of code, but for ICPCHUE, the true beginning was the moment we decided to break away from the standard 'white-page' documentation style. What started as a minimal Vite landing page quickly evolved into a comprehensive design system built on **Glassmorphism** and high-contrast aesthetics.

**The Design Philosophy:**

Our goal was to create an environment that felt high-tech yet accessible. We moved away from generic flat design in favor of depth, using blurred backgrounds, subtle borders, and layered elements to create a 'premium' feel that distinguishes the platform from typical educational tools.

**Key Visual Milestones:**

* **The Glassmorphism Transition**: Implementing \`backdrop-filter: blur()\` and semi-transparent backgrounds allowed us to layer information without overwhelming the user. This created a sense of hierarchy and focus.
* **3D Sticker Integration**: To add personality, we custom-designed 3D-style 'sticker peels' that act as visual markers. These aren't just images; they are designed to give the interface a tactile, physical quality.
* **Optimized Video Backgrounds**: We integrated high-performance WebM backgrounds to provide movement and energy without the performance penalty of traditional video formats, ensuring the site remains fast even on lower-end devices.
* **Brand Typography**: We selected a bold, high-contrast typography system that ensures readability while reinforcing the platform's professional identity.

**Technical Foundation:**

Before a single API route was defined, we spent days refining the React component architecture. We built a library of reusable UI primitives—buttons, cards, and modals—that follow these strict design tokens. This ensured that as the project scaled from a single landing page to a full-featured dashboard, the visual consistency remained absolute.

This 'Genesis' phase wasn't just about making things look good; it was about building a visual language that communicates competence and innovation. We established the yellow-and-black theme as our primary identity, a color palette that represents both energy and technical precision.`,
        media: [
            { type: 'image', src: '/devlog/landingpage.webp', alt: 'Original Landing Page' }
        ]
    }
];

export function getDevLog(id: number | string): LogEntry | undefined {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    return devLogs.find(log => log.id === numId);
}
