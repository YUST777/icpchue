import nodemailer from 'nodemailer';

// Shared Email Service
// Using Port 25 for internal Docker networking
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER || 'mailserver',
    port: 25,
    secure: false,
    auth: {
        user: process.env.SMTP_LOGIN,
        pass: process.env.SMTP_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false
    }
});

interface MailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
    [key: string]: unknown;
}

export const sendEmail = async (options: MailOptions) => {
    try {
        const mailOptions = {
            from: `"${process.env.SENDER_NAME || 'ICPC HUE'}" <${process.env.SENDER_EMAIL || process.env.SMTP_LOGIN}>`,
            ...options
        };
        return transporter.sendMail(mailOptions);
    } catch (error) {
        throw error;
    }
};

export const sendOtpEmail = async (email: string, code: string) => {
    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #333333; text-align: center;">Verify Your Email</h2>
  <p style="color: #555555; font-size: 16px;">Hello,</p>
  <p style="color: #555555; font-size: 16px;">Use the code below to verify your email for <strong>ICPC HUE</strong>:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <div style="display: inline-block; background: #f5f5f5; border: 2px dashed #ddd; border-radius: 8px; padding: 20px 40px;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
    </div>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #999999; font-size: 12px; text-align: center;">This code expires in 5 minutes. If you didn't request this, you can safely ignore it.</p>
</div>
`;

    return sendEmail({
        to: email,
        subject: 'ICPC HUE - Verification Code',
        text: `Your ICPC HUE verification code is: ${code}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, please ignore this email.\n`,
        html
    });
};

export const sendPasswordResetEmail = async (email: string, resetLink: string) => {
    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #333333; text-align: center;">Reset Your Password</h2>
  <p style="color: #555555; font-size: 16px;">Hello,</p>
  <p style="color: #555555; font-size: 16px;">You requested a password reset for your <strong>ICPC HUE</strong> account.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetLink}" style="background-color: #0088cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
  </div>

  <p style="color: #555555; font-size: 14px;">Or copy this link to your browser:</p>
  <p style="color: #0088cc; font-size: 14px; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">${resetLink}</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #999999; font-size: 12px; text-align: center;">This link is valid for 1 hour. If you didn't request this, you can safely ignore this email.</p>
</div>
`;

    return sendEmail({
        to: email,
        subject: 'Reset Password - ICPC HUE',
        text: `Hello,\n\nYou requested a password reset for your ICPC HUE account.\n\nPlease click the link below to reset your password:\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you did not request this, please ignore this email.\n`,
        html
    });
};
