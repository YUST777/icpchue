const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env
const envPath = path.resolve(__dirname, '.env');
console.log('Loading .env from', envPath);
dotenv.config({ path: envPath });

const CLIENT_ID = process.env.NEXT_PUBLIC_CF_CLIENT_ID;
const CLIENT_SECRET = process.env.CF_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/api/auth/callback/codeforces';

console.log('CLIENT_ID:', CLIENT_ID);
console.log('CLIENT_SECRET:', CLIENT_SECRET ? '******' + CLIENT_SECRET.slice(-4) : 'undefined');
console.log('REDIRECT_URI:', REDIRECT_URI);

async function testOAuth() {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', 'eVIqcl6gWgVEqMcQM2IKdKQBysV5vme5'); // Use the user's real (expired) code to test format
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('redirect_uri', REDIRECT_URI);
    // params.append('scope', 'openid profile'); // Removing scope to test

    console.log('Sending request to Codeforces (Body params, no scope)...');
    try {
        const res = await fetch('https://codeforces.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params,
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testOAuth();
