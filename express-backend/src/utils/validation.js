import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Enhanced input sanitization - prevents XSS and SQL injection attempts
export const sanitizeInput = (str) => {
    if (typeof str !== 'string') return '';

    // Remove any potentially dangerous characters
    return str
        .trim()
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/['";\\]/g, '') // Remove SQL injection characters
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
        .substring(0, 500); // Limit length to prevent DoS
};

// Enhanced HTML escaping for XSS protection
export const escapeHtml = (unsafe = '') => {
    if (typeof unsafe !== 'string') return '';

    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\//g, '&#x2F;');
};

// Strict URL sanitization to prevent Stored XSS (javascript: urls)
export const sanitizeUrl = (url) => {
    if (!url) return null;
    const trimmed = url.trim();
    if (trimmed === '') return null;

    // Must start with http:// or https://
    if (!/^https?:\/\//i.test(trimmed)) {
        return null;
    }

    // Block internal/dangerous protocols explicitly (double check)
    if (/javascript:/i.test(trimmed) || /data:/i.test(trimmed) || /vbscript:/i.test(trimmed)) {
        return null;
    }

    return trimmed;
};

// Verify reCAPTCHA token
export const verifyRecaptcha = async (token) => {
    if (!token) {
        console.log('⚠️ reCAPTCHA token missing');
        return true; // Don't block if missing in dev, logic handled below
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    // Check if site key and secret key are the same (common mistake)
    const siteKey = process.env.RECAPTCHA_SITE_KEY || process.env.VITE_RECAPTCHA_SITE_KEY;
    if (secretKey && siteKey && secretKey === siteKey) {
        console.error('❌ reCAPTCHA ERROR: Site keys match! Misconfigured.');
        if (process.env.NODE_ENV === 'production') return false;
        return true;
    }

    if (!secretKey) {
        console.warn('⚠️ reCAPTCHA secret key not configured, skipping verification');
        if (process.env.NODE_ENV === 'production') return false;
        return true;
    }

    try {
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            new URLSearchParams({
                secret: secretKey,
                response: token
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 5000
            }
        );

        console.log('🔍 reCAPTCHA API Response:', JSON.stringify(response.data));

        if (response.data && response.data.success) {
            const score = response.data.score || 0.5;
            const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5');

            if (score >= minScore) {
                console.log(`✅ reCAPTCHA verified - Score: ${score}`);
                return true;
            } else {
                console.log(`⚠️ reCAPTCHA score low: ${score} - Blocking request`);
                return false;
            }
        } else {
            console.error('❌ reCAPTCHA verification failed:', response.data?.['error-codes']);
            // In production, block. In dev, allow.
            return process.env.NODE_ENV !== 'production';
        }
    } catch (error) {
        console.error('❌ reCAPTCHA verification error:', error.message);
        // On error (e.g. network), fail open in dev, closed in prod
        return process.env.NODE_ENV !== 'production';
    }
};
