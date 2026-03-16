/**
 * Server-side reCAPTCHA v3 verification.
 * Validates the token with Google's API using the secret key.
 */

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;

export interface CaptchaResult {
    success: boolean;
    score?: number;
    action?: string;
    error?: string;
}

/**
 * Verify a reCAPTCHA token server-side.
 * @param token The reCAPTCHA token from the client
 * @param expectedAction Optional expected action name for v3
 * @param minScore Minimum score threshold (0.0 - 1.0), default 0.3
 */
export async function verifyCaptcha(
    token: string | null | undefined,
    expectedAction?: string,
    minScore: number = 0.3
): Promise<CaptchaResult> {
    if (!RECAPTCHA_SECRET) {
        console.warn('RECAPTCHA_SECRET_KEY not configured — skipping verification');
        return { success: true, score: 1.0 }; // Fail open if not configured
    }

    if (!token) {
        return { success: false, error: 'No captcha token provided' };
    }

    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${RECAPTCHA_SECRET}&response=${token}`,
        });

        const data = await response.json();

        if (!data.success) {
            return { success: false, error: 'Captcha verification failed' };
        }

        // For v3: check score
        if (data.score !== undefined && data.score < minScore) {
            return { success: false, score: data.score, error: 'Score too low — suspected bot' };
        }

        // Optionally validate action
        if (expectedAction && data.action !== expectedAction) {
            return { success: false, error: 'Action mismatch' };
        }

        return { success: true, score: data.score, action: data.action };
    } catch (err) {
        console.error('reCAPTCHA verification error:', err);
        return { success: true }; // Fail open on network error
    }
}
