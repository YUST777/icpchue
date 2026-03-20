```text
.
├── banner.jpg
├── CONTRIBUTING.md
├── database
│   └── migrations
│       ├── add_solution_video_url.sql
│       ├── create_curriculum_schema.sql
│       ├── fix_base_tables.sql
│       ├── fix_sequences.sql
│       ├── seed_level0_sheet_a.sql
│       └── update_sheet_a_solution_videos.sql
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── .dockerignore
├── docs
│   ├── rules
│   │   ├── BACKEND_RULES.md
│   │   ├── CODEFORCES_INTEGRATION_STUDY.md
│   │   ├── PROJECT_KNOWLEDGE_BASE.md
│   │   ├── REACT_RULES.MD
│   │   └── schema_reference.sql
│   └── security
│       ├── security_overview_report_en.md
│       └── security_overview_report.md
├── .env
├── .env.docker.example
├── express-backend
│   ├── bun.lock
│   ├── .env
│   ├── .env.example
│   ├── index.js
│   ├── package.json
│   ├── public
│   │   ├── 3d
│   │   │   ├── 500pts.glb
│   │   │   ├── bughunter.glb
│   │   │   ├── done_approvalcamp.glb
│   │   │   ├── instructor.glb
│   │   │   ├── sheet1.glb
│   │   │   └── WELCOME.glb
│   │   ├── favicon.webp
│   │   ├── file.svg
│   │   ├── fonts
│   │   │   ├── Outfit-Bold.ttf
│   │   │   └── Outfit-Regular.ttf
│   │   ├── globe.svg
│   │   ├── icons
│   │   │   ├── icon-192.png
│   │   │   └── icon-512.png
│   │   ├── icpchue-logo.webp
│   │   ├── images
│   │   │   ├── achievements
│   │   │   │   ├── 500pts.webp
│   │   │   │   ├── bughunter.webp
│   │   │   │   ├── done_approvalcamp.webp
│   │   │   │   ├── instructor.webp
│   │   │   │   ├── sheet1acheavment.webp
│   │   │   │   └── WELCOME.webp
│   │   │   ├── lessons
│   │   │   │   ├── approval
│   │   │   │   │   ├── approvalcamp.webp
│   │   │   │   │   ├── control-flow.webp
│   │   │   │   │   ├── datatypes.webp
│   │   │   │   │   └── revision.webp
│   │   │   │   └── winter
│   │   │   │       ├── complexity.webp
│   │   │   │       └── wintercamp.webp
│   │   │   ├── sheet
│   │   │   │   └── sheet1.webp
│   │   │   └── ui
│   │   │       ├── coding-dashboard.webp
│   │   │       ├── futuristic-library.webp
│   │   │       ├── linkmetadata.webp
│   │   │       ├── metadata.webp
│   │   │       ├── modern-coding-collaboration.webp
│   │   │       ├── modern-digital-library.webp
│   │   │       ├── navlogo.webp
│   │   │       └── sleek-coding.webp
│   │   ├── manifest.json
│   │   ├── next.svg
│   │   ├── tgs
│   │   │   ├── 1st Place Medal.json
│   │   │   ├── 2nd Place Medal.json
│   │   │   └── 3rd Place Medal.json
│   │   ├── vercel.svg
│   │   ├── videos
│   │   │   ├── applynow.webm
│   │   │   └── headervid.webm
│   │   └── window.svg
│   ├── scripts
│   │   ├── analyze_activity_detailed.js
│   │   ├── analyze_level2.js
│   │   ├── check_content.js
│   │   ├── check_data_encryption.js
│   │   ├── check_level2_content.js
│   │   ├── check_level2.js
│   │   ├── count_level2_final.js
│   │   ├── extract_top_users.js
│   │   ├── fix_achievements_db.js
│   │   ├── inspect_problem.js
│   │   ├── list_schema.js
│   │   ├── retro_achievements.js
│   │   ├── test-email.js
│   │   └── test_tts_voices.js
│   ├── src
│   │   ├── config
│   │   │   └── db.js
│   │   ├── middleware
│   │   │   ├── errorHandler.js
│   │   │   ├── logging.js
│   │   │   └── security.js
│   │   ├── services
│   │   │   ├── achievementService.js
│   │   │   ├── emailService.js
│   │   │   ├── judgeService.js
│   │   │   ├── scraper.js
│   │   │   └── scraperWorker.js
│   │   └── utils
│   │       ├── helpers.js
│   │       └── validation.js
│   └── start.sh
├── extension
│   ├── background.js
│   ├── content.js
│   ├── icons
│   │   ├── icon128.png
│   │   ├── icon16.png
│   │   └── icon48.png
│   ├── logo.webp
│   ├── manifest.json
│   ├── popup.html
│   └── popup.js
├── .gitignore
├── index.md
├── infrastructure
│   ├── judge0
│   │   ├── judge0.conf
│   │   └── judge0.conf.example
│   ├── mail-server
│   │   ├── docker-compose.yml
│   │   └── docker-data
│   │       └── dms
│   │           ├── config
│   │           │   └── dovecot-quotas.cf
│   │           ├── mail-data
│   │           ├── mail-logs
│   │           └── mail-state
│   ├── netdata
│   │   └── go.d
│   │       ├── redis.conf
│   │       └── redis.conf.example
│   ├── nginx
│   │   ├── default.conf
│   │   └── nginx.conf
│   └── pm2
│       └── ecosystem-stable.config.cjs
├── LICENSE
├── next-app
│   ├── app
│   │   ├── 2025
│   │   │   ├── dec
│   │   │   │   └── page.tsx
│   │   │   └── [id]
│   │   │       └── page.tsx
│   │   ├── api
│   │   │   ├── achievements
│   │   │   │   ├── [id]
│   │   │   │   │   └── seen
│   │   │   │   │       └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── admin
│   │   │   │   ├── applications
│   │   │   │   │   └── route.ts
│   │   │   │   ├── overview
│   │   │   │   │   └── route.ts
│   │   │   │   ├── rankings
│   │   │   │   │   └── route.ts
│   │   │   │   ├── sheet-progress
│   │   │   │   │   └── route.ts
│   │   │   │   ├── submissions
│   │   │   │   │   └── route.ts
│   │   │   │   ├── top-students
│   │   │   │   │   └── route.ts
│   │   │   │   └── users
│   │   │   │       └── route.ts
│   │   │   ├── analyze-complexity
│   │   │   │   └── route.ts
│   │   │   ├── auth
│   │   │   │   ├── callback
│   │   │   │   │   └── codeforces
│   │   │   │   │       └── route.ts
│   │   │   │   ├── check-application
│   │   │   │   │   └── route.ts
│   │   │   │   ├── check-email
│   │   │   │   │   └── route.ts
│   │   │   │   ├── codeforces
│   │   │   │   │   └── login
│   │   │   │   │       └── route.ts
│   │   │   │   ├── forgot-password
│   │   │   │   │   └── route.ts
│   │   │   │   ├── login
│   │   │   │   │   └── route.ts
│   │   │   │   ├── logout
│   │   │   │   │   └── route.ts
│   │   │   │   ├── me
│   │   │   │   │   └── route.ts
│   │   │   │   ├── register
│   │   │   │   │   └── route.ts
│   │   │   │   ├── reset-password
│   │   │   │   │   └── route.ts
│   │   │   │   ├── send-otp
│   │   │   │   │   └── route.ts
│   │   │   │   ├── update-profile
│   │   │   │   │   └── route.ts
│   │   │   │   └── verify-otp
│   │   │   │       └── route.ts
│   │   │   ├── codeforces
│   │   │   │   ├── mirror
│   │   │   │   │   └── route.ts
│   │   │   │   ├── problem-stats
│   │   │   │   │   └── route.ts
│   │   │   │   ├── report-solve
│   │   │   │   │   └── route.ts
│   │   │   │   ├── save-submission
│   │   │   │   │   └── route.ts
│   │   │   │   ├── submission
│   │   │   │   │   └── route.ts
│   │   │   │   ├── submissions
│   │   │   │   │   └── route.ts
│   │   │   │   ├── submit
│   │   │   │   │   └── route.ts
│   │   │   │   └── user-submissions
│   │   │   │       └── route.ts
│   │   │   ├── curriculum
│   │   │   │   ├── details
│   │   │   │   │   └── [levelSlug]
│   │   │   │   │       └── [sheetSlug]
│   │   │   │   │           └── route.ts
│   │   │   │   ├── levels
│   │   │   │   │   └── route.ts
│   │   │   │   ├── problem
│   │   │   │   │   └── [levelSlug]
│   │   │   │   │       └── [sheetSlug]
│   │   │   │   │           └── [problemLetter]
│   │   │   │   │               └── route.ts
│   │   │   │   ├── problems
│   │   │   │   │   └── [sheetId]
│   │   │   │   │       └── route.ts
│   │   │   │   ├── progress
│   │   │   │   │   └── route.ts
│   │   │   │   ├── roadmap
│   │   │   │   │   └── route.ts
│   │   │   │   └── sheets
│   │   │   │       └── [levelSlug]
│   │   │   │           └── route.ts
│   │   │   ├── get-ip
│   │   │   │   └── route.ts
│   │   │   ├── health
│   │   │   │   └── route.ts
│   │   │   ├── judge
│   │   │   │   ├── submit
│   │   │   │   │   └── route.ts
│   │   │   │   └── test
│   │   │   │       └── route.ts
│   │   │   ├── leaderboard
│   │   │   │   ├── route.ts
│   │   │   │   └── sheets
│   │   │   │       └── route.ts
│   │   │   ├── mirror
│   │   │   │   └── fetch
│   │   │   │       └── route.ts
│   │   │   ├── news
│   │   │   │   └── reactions
│   │   │   │       └── route.ts
│   │   │   ├── notifications
│   │   │   │   └── route.ts
│   │   │   ├── profile
│   │   │   │   └── [studentId]
│   │   │   │       └── route.ts
│   │   │   ├── recap
│   │   │   │   └── [id]
│   │   │   │       ├── route.ts
│   │   │   │       └── share
│   │   │   │           └── route.ts
│   │   │   ├── sheets
│   │   │   │   ├── my-submissions
│   │   │   │   │   └── route.ts
│   │   │   │   ├── solved
│   │   │   │   │   └── route.ts
│   │   │   │   ├── submission
│   │   │   │   │   └── [id]
│   │   │   │   │       └── route.ts
│   │   │   │   └── submit
│   │   │   │       └── route.ts
│   │   │   ├── stats
│   │   │   │   └── distribution
│   │   │   │       └── route.ts
│   │   │   ├── submissions
│   │   │   │   ├── cf
│   │   │   │   │   └── [id]
│   │   │   │   │       └── route.ts
│   │   │   │   ├── [id]
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── submit-application
│   │   │   │   └── route.ts
│   │   │   ├── user
│   │   │   │   ├── dashboard-stats
│   │   │   │   │   └── route.ts
│   │   │   │   ├── delete-pfp
│   │   │   │   │   └── route.ts
│   │   │   │   ├── delete-profile-data
│   │   │   │   │   └── route.ts
│   │   │   │   ├── privacy
│   │   │   │   │   └── route.ts
│   │   │   │   ├── refresh-cf
│   │   │   │   │   └── route.ts
│   │   │   │   └── upload-pfp
│   │   │   │       └── route.ts
│   │   │   ├── video
│   │   │   │   └── rate
│   │   │   │       └── route.ts
│   │   │   ├── views
│   │   │   │   └── route.ts
│   │   │   └── workspace
│   │   │       └── sync
│   │   │           └── route.ts
│   │   ├── auth
│   │   │   └── callback
│   │   │       └── route.ts
│   │   ├── dashboard
│   │   │   ├── achievements
│   │   │   │   └── page.tsx
│   │   │   ├── admin
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── leaderboard
│   │   │   │   └── page.tsx
│   │   │   ├── news
│   │   │   │   ├── loading.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── page.tsx
│   │   │   ├── profile
│   │   │   │   ├── page.tsx
│   │   │   │   └── [studentId]
│   │   │   │       └── page.tsx
│   │   │   ├── roadmap
│   │   │   │   └── page.tsx
│   │   │   ├── sessions
│   │   │   │   ├── [campSlug]
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [sessionNumber]
│   │   │   │   │       └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── settings
│   │   │   │   └── page.tsx
│   │   │   ├── sheets
│   │   │   │   ├── howtologin.jpg
│   │   │   │   ├── [level]
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [sheet]
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       └── [problem]
│   │   │   │   │           └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   └── stress
│   │   │       └── page.tsx
│   │   ├── Dec
│   │   │   ├── 2025
│   │   │   │   └── page.tsx
│   │   │   ├── [id]
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── devlog
│   │   │   ├── [id]
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── excalidraw.css
│   │   ├── fonts
│   │   │   └── Assistant
│   │   │       ├── Assistant-Bold.woff2
│   │   │       ├── Assistant-Medium.woff2
│   │   │       ├── Assistant-Regular.woff2
│   │   │       └── Assistant-SemiBold.woff2
│   │   ├── forgot-password
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── login
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   ├── privacy
│   │   │   └── page.tsx
│   │   ├── profile
│   │   │   └── [studentId]
│   │   │       └── page.tsx
│   │   ├── register
│   │   │   ├── constants.ts
│   │   │   └── page.tsx
│   │   ├── reset-password
│   │   │   └── page.tsx
│   │   ├── robots.ts
│   │   ├── sessions
│   │   │   ├── [campSlug]
│   │   │   │   ├── page.tsx
│   │   │   │   └── [sessionNumber]
│   │   │   │       ├── layout.tsx
│   │   │   │       └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── sitemap.ts
│   │   ├── terms
│   │   │   └── page.tsx
│   │   └── whiteboard
│   │       └── [...ids]
│   │           └── page.tsx
│   ├── bun.lock
│   ├── components
│   │   ├── 3d
│   │   │   ├── Badge3D.tsx
│   │   │   └── ModelPreloader.tsx
│   │   ├── achievements
│   │   │   ├── AchievementRevealModal.tsx
│   │   │   ├── AchievementsWidget.tsx
│   │   │   └── AchievementToast.tsx
│   │   ├── common
│   │   │   ├── Counter.tsx
│   │   │   ├── Loader.tsx
│   │   │   ├── TestCasesLoader.tsx
│   │   │   ├── TraineeIcon.tsx
│   │   │   ├── TrainerIcon.tsx
│   │   │   └── VirtualLeaderboard.tsx
│   │   ├── core
│   │   │   ├── ClientVersionManager.tsx
│   │   │   ├── ExtensionGate.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── Providers.tsx
│   │   ├── dashboard
│   │   │   ├── ActivityCalendar.tsx
│   │   │   ├── CurrentSheetWidget.tsx
│   │   │   ├── HeroSection.tsx
│   │   │   ├── profile
│   │   │   │   ├── IdentityCard.tsx
│   │   │   │   ├── LeaderboardWidget.tsx
│   │   │   │   ├── ProfileEditModal.tsx
│   │   │   │   ├── SocialLinks.tsx
│   │   │   │   └── StatsGrid.tsx
│   │   │   ├── ProgressRing.tsx
│   │   │   ├── Sheet1Widget.tsx
│   │   │   ├── SidebarLogo.tsx
│   │   │   ├── SidebarToggle.tsx
│   │   │   └── StatsFooter.tsx
│   │   ├── InfiniteGrid.tsx
│   │   ├── landing
│   │   │   ├── BuildingPublicly.tsx
│   │   │   ├── Contact.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── InstallBanner.tsx
│   │   │   ├── InstallPWA.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── Network.tsx
│   │   │   ├── SecurityArchitecture.tsx
│   │   │   ├── Services.tsx
│   │   │   └── Showcase.tsx
│   │   ├── mirror
│   │   │   ├── AnalyticsTab.tsx
│   │   │   ├── AnalyticsView.tsx
│   │   │   ├── CFProblemDescription.tsx
│   │   │   ├── CodeWorkspace.tsx
│   │   │   ├── ComplexityModal.tsx
│   │   │   ├── DescriptionTab.tsx
│   │   │   ├── editor
│   │   │   │   ├── CodeWorkspace.tsx
│   │   │   │   ├── ComplexityModal.tsx
│   │   │   │   ├── EditorConstants.ts
│   │   │   │   ├── EditorToolbar.tsx
│   │   │   │   ├── index.ts
│   │   │   │   └── useVerticalResize.ts
│   │   │   ├── ExcalidrawCanvas.tsx
│   │   │   ├── ExcalidrawWrapper.tsx
│   │   │   ├── ExtensionOnboardingModal.tsx
│   │   │   ├── HandleInputModal.tsx
│   │   │   ├── HandleInputSection.tsx
│   │   │   ├── OnboardingTour.tsx
│   │   │   ├── problem
│   │   │   │   ├── CFProblemDescription.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── ProblemDrawer.tsx
│   │   │   │   ├── ProblemHeader.tsx
│   │   │   │   ├── ProblemLeftPanel.tsx
│   │   │   │   ├── ProblemTabs.tsx
│   │   │   │   └── SidebarTabs.tsx
│   │   │   ├── ProblemContent.tsx
│   │   │   ├── ProblemHeader.tsx
│   │   │   ├── ProblemLeftPanel.tsx
│   │   │   ├── ProblemTabs.tsx
│   │   │   ├── shared
│   │   │   │   ├── index.ts
│   │   │   │   ├── MarkdownRenderer.tsx
│   │   │   │   └── types.ts
│   │   │   ├── SolutionTab.tsx
│   │   │   ├── SolutionView.tsx
│   │   │   ├── SubmissionDetailModal.tsx
│   │   │   ├── SubmissionsList.tsx
│   │   │   ├── SubmissionsTab.tsx
│   │   │   ├── testrunner
│   │   │   │   ├── CFStatusTab.tsx
│   │   │   │   ├── TestCaseTab.tsx
│   │   │   │   ├── TestResultTab.tsx
│   │   │   │   └── verdictUtils.tsx
│   │   │   ├── TestRunnerPanel.tsx
│   │   │   ├── types.ts
│   │   │   ├── WhiteboardEditor.tsx
│   │   │   ├── WhiteboardHeader.tsx
│   │   │   ├── WhiteboardSection.tsx
│   │   │   └── Whiteboard.tsx
│   │   ├── onboarding
│   │   │   ├── DashboardOnboardingTour.tsx
│   │   │   ├── DashboardTutorialModal.tsx
│   │   │   └── TutorialModal.tsx
│   │   └── ui
│   │       ├── button-1.tsx
│   │       ├── icons
│   │       │   └── SidebarToggleIcon.tsx
│   │       ├── Skeleton.tsx
│   │       ├── spinner-1.tsx
│   │       ├── toast.tsx
│   │       └── tracing-beam.tsx
│   ├── context
│   │   └── MapExpandedContext.tsx
│   ├── contexts
│   │   ├── AuthContext.tsx
│   │   └── LanguageContext.tsx
│   ├── data
│   │   └── problems-metadata.json
│   ├── dev.log
│   ├── .env
│   ├── .env.example
│   ├── .env.production
│   ├── eslint.config.mjs
│   ├── .gitignore
│   ├── hooks
│   │   ├── contest
│   │   │   ├── useCodeforcesHandle.ts
│   │   │   ├── useCodeforcesSubmission.ts
│   │   │   ├── useCodePersistence.ts
│   │   │   ├── useCustomTestCases.ts
│   │   │   ├── useLocalTestRunner.ts
│   │   │   ├── useProblemData.ts
│   │   │   ├── useResizableLayout.ts
│   │   │   ├── useWhiteboardAPI.ts
│   │   │   ├── useWhiteboardData.ts
│   │   │   ├── useWhiteboardResize.ts
│   │   │   └── useWhiteboardStore.ts
│   │   ├── useAchievements.ts
│   │   └── useDashboardStats.ts
│   ├── lib
│   │   ├── achievements.ts
│   │   ├── admin-auth.ts
│   │   ├── admin-client.ts
│   │   ├── api-cache.ts
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── cache.ts
│   │   ├── cache-version.ts
│   │   ├── captcha.ts
│   │   ├── codeforces.ts
│   │   ├── crypto.ts
│   │   ├── curriculum.ts
│   │   ├── db.ts
│   │   ├── devlog-search.ts
│   │   ├── devlog.ts
│   │   ├── emailService.js
│   │   ├── emailService.ts
│   │   ├── email.ts
│   │   ├── encryption.ts
│   │   ├── jwt.ts
│   │   ├── parseCodeforcesUrl.ts
│   │   ├── problems.ts
│   │   ├── queue.ts
│   │   ├── rate-limit.ts
│   │   ├── recaptcha.ts
│   │   ├── redis.ts
│   │   ├── sessionContent
│   │   │   ├── Programming1Content.tsx
│   │   │   ├── Session1Content.tsx
│   │   │   ├── Session3Content.tsx
│   │   │   ├── Session4Content.tsx
│   │   │   └── Session5Content.tsx
│   │   ├── sessionData.tsx
│   │   ├── simple-rate-limit.ts
│   │   ├── supabase
│   │   │   ├── admin.ts
│   │   │   ├── client.ts
│   │   │   ├── middleware.ts
│   │   │   └── server.ts
│   │   ├── translations.ts
│   │   ├── types.ts
│   │   ├── utils
│   │   │   ├── codeforcesUtils.ts
│   │   │   └── codeTemplates.ts
│   │   ├── utils.ts
│   │   └── validation.ts
│   ├── middleware.ts
│   ├── migrate_details.ts
│   ├── migrations
│   │   ├── 004_cf_submissions_and_indexes.sql
│   │   ├── 005_cleanup_duplicates_and_rls.sql
│   │   ├── 006_fix_remaining_rls_warnings.sql
│   │   ├── 007_drop_unnecessary_auth_policies.sql
│   │   ├── 008_user_achievements_unique.sql
│   │   ├── 010_leaderboard_rank1_history.sql
│   │   ├── 011_notifications.sql
│   │   └── 012_security_fixes.sql
│   ├── mirror
│   │   ├── cli_fetch.js
│   │   ├── package.json
│   │   └── package-lock.json
│   ├── next.config.js
│   ├── next-env.d.ts
│   ├── next.log
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.mjs
│   ├── public
│   │   ├── 3d
│   │   │   ├── 500pts.glb
│   │   │   ├── bughunter.glb
│   │   │   ├── done_approvalcamp.glb
│   │   │   ├── instructor.glb
│   │   │   ├── rank1_march.glb
│   │   │   ├── sheet1.glb
│   │   │   └── WELCOME.glb
│   │   ├── apple-touch-icon.webp
│   │   ├── devlog
│   │   │   ├── dashbaord.webp
│   │   │   ├── devlog.webp
│   │   │   ├── formlanding.webp
│   │   │   ├── frompage.webp
│   │   │   ├── landingpage.webp
│   │   │   ├── leader.webp
│   │   │   ├── problempage.webp
│   │   │   ├── profile.webp
│   │   │   ├── recap1.webp
│   │   │   ├── recap4.webp
│   │   │   ├── sec1.webp
│   │   │   ├── sec2.webp
│   │   │   ├── sec3.webp
│   │   │   ├── sec4.webp
│   │   │   ├── sec5.webp
│   │   │   ├── sec6.webp
│   │   │   ├── sec7.webp
│   │   │   ├── sec8.webp
│   │   │   ├── sheet1.webp
│   │   │   └── v3-banner.jpg
│   │   ├── favicon-16x16.webp
│   │   ├── favicon-192x192.webp
│   │   ├── favicon-32x32.webp
│   │   ├── favicon-48x48.webp
│   │   ├── favicon-512x512.webp
│   │   ├── favicon-64x64.webp
│   │   ├── favicon.ico
│   │   ├── favicon.webp
│   │   ├── file.svg
│   │   ├── fonts
│   │   │   ├── Outfit-Bold.ttf
│   │   │   └── Outfit-Regular.ttf
│   │   ├── globe.svg
│   │   ├── icons
│   │   │   ├── Codeforces.colored.svg
│   │   │   ├── icon-192.png
│   │   │   ├── icon-192.webp
│   │   │   ├── icon-512.png
│   │   │   ├── icon-512.webp
│   │   │   └── icpchue.svg
│   │   ├── icpchue-helper.zip
│   │   ├── icpchue-logo.webp
│   │   ├── images
│   │   │   ├── achievements
│   │   │   │   ├── 500pts.webp
│   │   │   │   ├── bughunter.webp
│   │   │   │   ├── done_approvalcamp.webp
│   │   │   │   ├── instructor.webp
│   │   │   │   ├── rank1_march.webp
│   │   │   │   ├── sheet1acheavment.webp
│   │   │   │   └── WELCOME.webp
│   │   │   ├── lessons
│   │   │   │   ├── approval
│   │   │   │   │   ├── approvalcamp.webp
│   │   │   │   │   ├── control-flow.webp
│   │   │   │   │   ├── datatypes.webp
│   │   │   │   │   └── revision.webp
│   │   │   │   ├── levels
│   │   │   │   │   ├── 0.webp
│   │   │   │   │   ├── 1.webp
│   │   │   │   │   ├── 2.webp
│   │   │   │   │   └── roadmap.webp
│   │   │   │   ├── pro1
│   │   │   │   │   ├── examtraining.webp
│   │   │   │   │   ├── howtologin.webp
│   │   │   │   │   ├── pro1camp.webp
│   │   │   │   │   └── revison.webp
│   │   │   │   └── winter
│   │   │   │       ├── complexity.webp
│   │   │   │       └── wintercamp.webp
│   │   │   ├── sheet
│   │   │   │   └── sheet1.webp
│   │   │   └── ui
│   │   │       ├── banner.jpg
│   │   │       ├── coding-dashboard.webp
│   │   │       ├── futuristic-library.webp
│   │   │       ├── linkmetadata.webp
│   │   │       ├── metadata.webp
│   │   │       ├── modern-coding-collaboration.webp
│   │   │       ├── modern-digital-library.webp
│   │   │       ├── nav_logo_new.webp
│   │   │       ├── navlogo.webp
│   │   │       └── sleek-coding.webp
│   │   ├── manifest.json
│   │   ├── News
│   │   │   ├── 2025recap.webp
│   │   │   ├── decreport.webp
│   │   │   └── devlog.webp
│   │   ├── next.svg
│   │   ├── pattern.svg
│   │   ├── pfps
│   │   ├── security.txt
│   │   ├── sw.js
│   │   ├── tgs
│   │   │   ├── 1st Place Medal.json
│   │   │   ├── 2nd Place Medal.json
│   │   │   └── 3rd Place Medal.json
│   │   ├── vercel.svg
│   │   ├── videos
│   │   │   ├── applynow.webm
│   │   │   └── headervid.webm
│   │   ├── .well-known
│   │   │   └── security.txt
│   │   └── window.svg
│   ├── scripts
│   │   ├── add-group-id-column.js
│   │   ├── add-performance-indexes.js
│   │   ├── check-app-columns.js
│   │   ├── check-columns.js
│   │   ├── check-content-status.js
│   │   ├── check-levels.js
│   │   ├── check-problem-counts.js
│   │   ├── check-schema.js
│   │   ├── check-tables.js
│   │   ├── check-user-columns.js
│   │   ├── check-values.js
│   │   ├── cleanup-problems-table.js
│   │   ├── convert_images.py
│   │   ├── debug-db.js
│   │   ├── delete-test-user.ts
│   │   ├── expand-curriculum.js
│   │   ├── fix-level0-slug.js
│   │   ├── generate_recap_image.py
│   │   ├── grant-all-achievements.ts
│   │   ├── inspect-db-schema.js
│   │   ├── inspect-schema.js
│   │   ├── legacy
│   │   │   ├── apply_migration_012.js
│   │   │   ├── check_all_users.js
│   │   │   ├── check_recent_users.js
│   │   │   ├── check_schema.js
│   │   │   ├── check_tables.js
│   │   │   ├── clear_all_ghosts.ts
│   │   │   ├── debug_blind_index.js
│   │   │   ├── decrypt_email.js
│   │   │   ├── delete_user.js
│   │   │   ├── delete_user.ts
│   │   │   ├── final_wipe.js
│   │   │   ├── init-curriculum-db.js
│   │   │   ├── populate-sheet-a.js
│   │   │   ├── set-admin.js
│   │   │   ├── test-cf-oauth.js
│   │   │   ├── test-db.js
│   │   │   └── verify_fixes.ts
│   │   ├── migrate-pre-mirror.js
│   │   ├── populate-curriculum.js
│   │   ├── populate-recap-2025.js
│   │   ├── populate-recap-2025.ts
│   │   ├── pre-mirror-content.js
│   │   ├── rename-level1-slugs.js
│   │   ├── seed-level1.js
│   │   ├── sync-progress.js
│   │   ├── sync-user-progress.js
│   │   ├── test-api-key.js
│   │   ├── test-cf-token.js
│   │   ├── verify-integrity.js
│   │   └── vjudge_scraper.js
│   ├── server.js
│   ├── supabase
│   │   └── migrations
│   │       ├── 20240101_enable_rls.sql
│   │       └── 20241231_create_recap_2025.sql
│   └── tsconfig.json
├── .npmrc
├── pfps
├── README.md
├── scrapling-bridge
│   ├── bridge.log
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── scripts
│   ├── backup_to_telegram.sh
│   ├── build.sh
│   ├── check_csp.js
│   ├── clean_problems.py
│   ├── deploy-backend.sh
│   ├── email
│   │   └── EMAIL_TEMPLATE.html
│   ├── init-otp-db.js
│   ├── legacy
│   │   ├── delete_user.js
│   │   ├── event2.webp
│   │   ├── send_bulk_emails.py
│   │   └── test_send_email.py
│   ├── migrate-users-to-supabase-auth.js
│   ├── scraping
│   │   ├── assiut
│   │   │   ├── ICPC Assiut Materials.xlsx
│   │   │   ├── ICPC Assiut Newcomers Training.xlsx
│   │   │   └── problems-with-links.json
│   │   └── scraper-tool
│   │       ├── package.json
│   │       ├── package-lock.json
│   │       └── scrape.js
│   ├── seed_user.js
│   ├── setup-news-reactions.js
│   └── test-production-1k.js
└── SECURITY.md

238 directories, 600 files
```
