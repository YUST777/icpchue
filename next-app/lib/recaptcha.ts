// Google reCAPTCHA v3 utility - Adapted for Next.js

declare global {
    interface Window {
        grecaptcha: {
            ready: (callback: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
    }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LdBYRQsAAAAAOsYGXNhnrklR_iS6hQN_OalQ2NF';

export const executeRecaptcha = async (action = 'submit'): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('Window not available'));
            return;
        }

        const siteKey = SITE_KEY;
        if (!siteKey) {
            reject(new Error('NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set in environment variables'));
            return;
        }

        // Wait for grecaptcha to be available with timeout
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max wait (100 * 100ms)

        const executeWithRetry = (retryCount = 0) => {
            if (!window.grecaptcha || !window.grecaptcha.execute) {
                if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(() => executeWithRetry(retryCount), 100);
                    return;
                } else {
                    reject(new Error('reCAPTCHA not loaded. Please refresh the page.'));
                    return;
                }
            }

            // Use ready callback if available
            const doExecute = () => {
                try {
                    window.grecaptcha
                        .execute(siteKey, { action })
                        .then((token) => {
                            if (token && token.length > 0) {
                                resolve(token);
                            } else if (retryCount < 3) {
                                console.warn(`reCAPTCHA returned empty token, retrying... (${retryCount + 1}/3)`);
                                setTimeout(() => executeWithRetry(retryCount + 1), 1000);
                            } else {
                                reject(new Error('reCAPTCHA returned empty token after retries'));
                            }
                        })
                        .catch((error) => {
                            const errorStr = error?.toString() || '';
                            if (errorStr.includes('private-token') ||
                                errorStr.includes('401') ||
                                errorStr.includes('Unauthorized')) {
                                console.warn('reCAPTCHA initialization warning (can be ignored):', error);
                                if (retryCount < 3) {
                                    setTimeout(() => executeWithRetry(retryCount + 1), 1000);
                                } else {
                                    reject(new Error('reCAPTCHA failed after all retries'));
                                }
                            } else {
                                console.error('reCAPTCHA execution error:', error);
                                if (retryCount < 2) {
                                    setTimeout(() => executeWithRetry(retryCount + 1), 1000);
                                } else {
                                    reject(error);
                                }
                            }
                        });
                } catch (error) {
                    console.error('reCAPTCHA execution exception:', error);
                    if (retryCount < 2) {
                        setTimeout(() => executeWithRetry(retryCount + 1), 1000);
                    } else {
                        reject(error);
                    }
                }
            };

            if (window.grecaptcha.ready) {
                window.grecaptcha.ready(doExecute);
            } else {
                doExecute();
            }
        };

        executeWithRetry();
    });
};

// Load reCAPTCHA script dynamically
export const loadRecaptcha = (siteKey?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('Window not available'));
            return;
        }

        const key = siteKey || SITE_KEY;

        // Check if already loaded and ready
        if (window.grecaptcha) {
            if (window.grecaptcha.ready) {
                window.grecaptcha.ready(() => {
                    resolve();
                });
            } else {
                resolve();
            }
            return;
        }

        // Check if script is already in the HTML
        const existingScript = document.querySelector(`script[src*="recaptcha/api.js"]`);
        if (existingScript) {
            const checkInterval = setInterval(() => {
                if (window.grecaptcha) {
                    clearInterval(checkInterval);
                    if (window.grecaptcha.ready) {
                        window.grecaptcha.ready(() => {
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                }
            }, 100);

            setTimeout(() => {
                clearInterval(checkInterval);
                if (window.grecaptcha) {
                    resolve();
                } else {
                    reject(new Error('reCAPTCHA script loaded but grecaptcha not available'));
                }
            }, 10000);
            return;
        }

        // Script not found, create it dynamically
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=${key}`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            const checkInterval = setInterval(() => {
                if (window.grecaptcha) {
                    clearInterval(checkInterval);
                    if (window.grecaptcha.ready) {
                        window.grecaptcha.ready(() => {
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                }
            }, 100);

            setTimeout(() => {
                clearInterval(checkInterval);
                if (window.grecaptcha) {
                    resolve();
                } else {
                    reject(new Error('reCAPTCHA script loaded but grecaptcha not available'));
                }
            }, 5000);
        };

        script.onerror = () => {
            reject(new Error('Failed to load reCAPTCHA script'));
        };

        document.head.appendChild(script);
    });
};
