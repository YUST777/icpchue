import { z } from 'zod';

export const emailSchema = z.string()
    .email('Invalid email address')
    .min(5, 'Email too short')
    .max(255, 'Email too long')
    .toLowerCase();

export const passwordSchema = z.string()
    .min(9, 'Password must be at least 9 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .max(100, 'Password too long');

export const sanitizeInput = (str: unknown): string => {
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

