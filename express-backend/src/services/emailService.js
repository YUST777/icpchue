import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');

// Shared Email Service
// Using Port 25 for internal Docker networking (reliable STARTTLS-free communication)
export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER || 'mailserver',
    port: 25,
    secure: false, // Port 25 is plain SMTP
    ignoreTLS: true, // Bypass STARTTLS to avoid Bun's node:tls crash
    auth: {
        user: process.env.SMTP_LOGIN,
        pass: process.env.SMTP_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false
    }
});

export const sendEmail = async (options) => {
    try {
        const mailOptions = {
            from: `"${process.env.SENDER_NAME || 'ICPC HUE'}" <${process.env.SENDER_EMAIL || process.env.SMTP_LOGIN}>`,
            replyTo: process.env.SENDER_EMAIL || process.env.SMTP_LOGIN,
            headers: {
                'X-Mailer': 'ICPC HUE Platform',
                'X-Priority': '3',
                'X-MSMail-Priority': 'Normal',
                'Importance': 'Normal',
                'List-Unsubscribe': `<mailto:${process.env.SENDER_EMAIL || process.env.SMTP_LOGIN}?subject=unsubscribe>`,
                'Precedence': 'bulk',
            },
            ...options
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

export const sendPasswordResetEmail = async (email, resetLink) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - ICPC HUE</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #E8C15A 0%, #CFA144 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: bold;">ICPC HUE</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h2>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello,</p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">You requested a password reset for your <strong>ICPC HUE</strong> account. Click the button below to create a new password:</p>
              
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 4px; background-color: #E8C15A;">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; color: #1a1a1a; text-decoration: none; font-weight: bold; font-size: 16px;">Reset Password</a>
                  </td>
                </tr>
              </table>

              <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 30px 0 10px 0;">Or copy and paste this link into your browser:</p>
              <p style="color: #E8C15A; font-size: 14px; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 4px; border-left: 3px solid #E8C15A;">${resetLink}</p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0;">
                <strong>Security Notice:</strong> This link is valid for 24 hours. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
              <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">© ${new Date().getFullYear()} ICPC HUE - Horus University Egypt</p>
              <p style="color: #999999; font-size: 12px; margin: 0;">
                <a href="https://icpchue.com" style="color: #E8C15A; text-decoration: none;">Visit Website</a> | 
                <a href="https://icpchue.com/privacy" style="color: #E8C15A; text-decoration: none;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    return sendEmail({
        to: email,
        subject: '🔐 Reset Your Password - ICPC HUE',
        text: `Hello,\n\nYou requested a password reset for your ICPC HUE account.\n\nPlease click the link below to reset your password:\n${resetLink}\n\nThis link expires in 24 hours.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nICPC HUE Team\nhttps://icpchue.com`,
        html
    });
};
