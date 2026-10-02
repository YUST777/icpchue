# OTP verification runbook

The automatic CI job runs the OTP contract checks and a production build on every relevant pull request and push. Those checks prove that the application still uses the six-digit Supabase OTP path and that the routes compile; they cannot prove delivery to an inbox.

Use the manual **OTP checks** workflow for the real delivery check:

1. Choose `Run workflow`, select `send`, and enter a dedicated unused `@horus.edu.eg` test mailbox.
2. Confirm that the message arrives with a six-digit code and that it contains no magic-link button.
3. Run the workflow again with `verify`, the same mailbox, and that six-digit code.

The verify run must return `success: true`. A duplicate-account response is expected for an already registered address and is not a positive OTP test. Do not use a student's production address for this check.

The same checks can be run locally:

```sh
cd next-app
npm run test:otp
BASE_URL=https://www.icpchue.com TEST_EMAIL=student@horus.edu.eg npm run otp:smoke
BASE_URL=https://www.icpchue.com OTP_ACTION=verify TEST_EMAIL=student@horus.edu.eg OTP_CODE=123456 npm run otp:smoke
```

Never commit the test mailbox, SMTP credentials, Supabase keys, or the OTP code.
