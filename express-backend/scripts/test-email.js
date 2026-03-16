import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail } from './src/services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

async function test() {
    console.log('Testing email service with settings:');
    console.log('SMTP_SERVER:', process.env.SMTP_SERVER);
    console.log('SMTP_LOGIN:', process.env.SMTP_LOGIN);

    try {
        await sendEmail({
            to: '8241043@horus.edu.eg',
            subject: 'Test Email from ICPC HUE Mail Server',
            text: 'This is a test email from the newly configured icpchue.com mail server.',
            html: '<h1>ICPC HUE Test</h1><p>This is a test email from the newly configured <b>icpchue.com</b> mail server.</p>'
        });
        console.log('Test email sent successfully!');
    } catch (error) {
        console.error('Failed to send test email:', error);
    }
}

test();
