const baseUrl = (process.env.BASE_URL || '').replace(/\/$/, '');
const email = (process.env.TEST_EMAIL || '').trim().toLowerCase();
const action = process.env.OTP_ACTION || 'send';
const code = (process.env.OTP_CODE || '').trim();

if (!baseUrl) throw new Error('BASE_URL is required, for example https://www.icpchue.com');
if (!email || !/^[^\s@]+@horus\.edu\.eg$/i.test(email)) {
  throw new Error('TEST_EMAIL must be a dedicated unused @horus.edu.eg test inbox');
}
if (!['send', 'verify'].includes(action)) throw new Error('OTP_ACTION must be send or verify');
if (action === 'verify' && !/^\d{6}$/.test(code)) throw new Error('OTP_CODE must be the six-digit code from the test inbox');

const endpoint = action === 'send' ? '/api/auth/send-otp' : '/api/auth/verify-otp';
const body = action === 'send' ? { email } : { email, code };
const response = await fetch(`${baseUrl}${endpoint}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'user-agent': 'icpchue-otp-smoke/1.0' },
  body: JSON.stringify(body),
});
const payload = await response.json().catch(() => ({}));

if (!response.ok || payload.success !== true) {
  throw new Error(`${action} failed with HTTP ${response.status}: ${payload.error || 'unexpected response'}`);
}

console.log(`${action} passed for the dedicated test inbox (HTTP ${response.status}).`);
