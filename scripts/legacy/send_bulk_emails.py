import smtplib
from email.message import EmailMessage
from email.utils import make_msgid
import sqlite3
import time
import os
import sys

# Configuration
DB_PATH = '/home/ubuntu/icpchue/data.db'
IMAGE_PATH = '/home/ubuntu/icpchue/event2.webp'
LOG_FILE = '/home/ubuntu/icpchue/email_campaign.log'

SMTP_SERVER = 'localhost'
SMTP_PORT = 25
SENDER_EMAIL = 'noreply@icpchue.com'
SENDER_NAME = 'ICPC HUE'

# Rate Limiting (Option B)
DELAY_BETWEEN_EMAILS = 3  # seconds
PAUSE_EVERY_X_EMAILS = 100
PAUSE_DURATION = 10       # seconds

def log_message(msg):
    # Print to console (if attached) and append to log file
    print(msg)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} - {msg}\n")

def get_students():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # Only select students who have a valid ID so we can construct the email
        cursor.execute("SELECT id, name FROM students WHERE id IS NOT NULL AND id != ''")
        students = cursor.fetchall()
        conn.close()
        return students
    except Exception as e:
        log_message(f"Failed to connect to DB: {e}")
        return []

def create_email(student_id, student_name):
    receiver_email = f"{student_id.strip()}@hours.edu.eg"
    
    # Fallback to "الطالب" if name is missing or too short
    display_name = student_name.strip() if student_name and len(student_name.strip()) > 1 else "الطالب"
    # Optionally get just the first name for friendliness
    first_name = display_name.split(' ')[0]

    msg = EmailMessage()
    msg['Subject'] = 'أهلاً بك في Orientation Day من ICPC HUE 🔥'
    msg['From'] = f'{SENDER_NAME} <{SENDER_EMAIL}>'
    msg['To'] = receiver_email

    image_cid = make_msgid()

    html_content = f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f4f4;
                color: #333;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                direction: rtl;
                text-align: right;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }}
            .banner img {{
                width: 100%;
                height: auto;
                display: block;
            }}
            .content {{
                padding: 30px;
                text-align: right;
                direction: rtl;
            }}
            h1 {{
                color: #2c3e50;
                margin-top: 0;
                text-align: right;
            }}
            p {{
                text-align: right;
            }}
            .list-item {{
                margin-bottom: 10px;
                padding-right: 20px;
                position: relative;
                text-align: right;
            }}
            .list-item::before {{
                content: "•";
                color: #E8C15A;
                font-size: 20px;
                position: absolute;
                right: 0;
                top: -2px;
            }}
            .details-box {{
                background: #f8f9fa;
                border-right: 4px solid #E8C15A;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
                text-align: right;
            }}
            .details-box p {{
                margin: 5px 0;
                font-weight: bold;
            }}
        </style>
    </head>
    <body dir="rtl" style="direction: rtl; text-align: right;">
        <div class="container" dir="rtl" style="direction: rtl; text-align: right;">
            <div class="banner">
                <img src="cid:{image_cid[1:-1]}" alt="Orientation Day Banner" style="width: 100%; height: auto; display: block;">
            </div>
            <div class="content" dir="rtl" style="direction: rtl; text-align: right;">
                <h1 style="direction: rtl; text-align: right;">أهلاً {first_name} 👋</h1>
                <p style="direction: rtl; text-align: right;">جاهز تبدأ رحلتك في الـ Problem Solving؟</p>
                <p style="direction: rtl; text-align: right;">مجتمع ICPC HUE بيعزمك على الـ <strong>Orientation Day</strong>! فرصة تعرف إزاي البرمجة التنافسية هتغير مسارك التقني وتأهلك لشركات زي جوجل ونون 🤔.</p>
                
                <p style="direction: rtl; text-align: right;">بحضور خبرات وأبطال الـ ACPC:</p>
                <div style="padding-right: 15px; margin-right: 5px; direction: rtl; text-align: right;">
                    <div class="list-item" style="direction: rtl; text-align: right;"><strong>م. عاصم جادو:</strong> مطور Backend في UIS، مؤسس بـ ACPC DU، وخبرة طويلة كمتسابق ومدرب.</div>
                    <div class="list-item" style="direction: rtl; text-align: right;"><strong>م. حسام حسن:</strong> قائد أول فريق يصعد للتصفيات الإقليمية <span dir="ltr" style="direction: ltr; display: inline-block;">(ACPC Region)</span>.</div>
                    <div class="list-item" style="direction: rtl; text-align: right;"><strong>م. بلال البابلي:</strong> الـ Tech Lead في ACPC DU وأحد أمهر كفاءات المجتمع التقنية.</div>
                </div>

                <div class="details-box" dir="rtl" style="direction: rtl; text-align: right; border-right: 4px solid #E8C15A; background: #f8f9fa; padding: 15px; margin: 20px 0;">
                    <p style="direction: rtl; text-align: right; margin: 5px 0;">📍 <strong>في:</strong> كلية الذكاء الاصطناعي - قاعة H403</p>
                    <p style="direction: rtl; text-align: right; margin: 5px 0;">📅 <strong>تاريخ:</strong> 12/3/2026</p>
                    <p style="direction: rtl; text-align: right; margin: 5px 0;">⏰ <strong>وقت:</strong> 12PM - 2PM</p>
                </div>

                <p style="text-align: center; direction: rtl; font-size: 18px; margin-top: 30px;">
                    <strong>متفوتش الفرصة، مستنيينك! 🔥</strong>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    msg.set_content('This email requires an HTML compatible viewer.')
    msg.add_alternative(html_content, subtype='html')

    # Attach image
    try:
        with open(IMAGE_PATH, 'rb') as img:
            img_data = img.read()
        msg.get_payload()[1].add_related(img_data, 'image', 'webp', cid=image_cid)
    except Exception as e:
        log_message(f"[{student_id}] Failed to load image: {e}")

    return msg, receiver_email

def main():
    log_message("=== Starting Bulk Email Campaign ===")
    
    students = get_students()
    total_students = len(students)
    
    if total_students == 0:
        log_message("No students found. Exiting.")
        sys.exit(0)
        
    log_message(f"Found {total_students} students to email.")
    
    success_count = 0
    fail_count = 0
    
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        log_message("Connected to SMTP server.")
        
        for index, (student_id, student_name) in enumerate(students, 1):
            try:
                msg, receiver_email = create_email(student_id, student_name)
                server.send_message(msg)
                
                success_count += 1
                log_message(f"[{index}/{total_students}] Sent to {receiver_email} ({student_name})")
                
            except smtplib.SMTPServerDisconnected:
                log_message(f"[{index}/{total_students}] Connection lost. Reconnecting...")
                # Try to reconnect
                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                try:
                    server.send_message(msg)
                    success_count += 1
                    log_message(f"[{index}/{total_students}] Resent to {receiver_email}")
                except Exception as inner_e:
                    fail_count += 1
                    log_message(f"[{index}/{total_students}] Failed after reconnect for {receiver_email}: {inner_e}")
                    
            except Exception as e:
                fail_count += 1
                log_message(f"[{index}/{total_students}] Failed to send to {student_id}: {e}")

            # Rate Limiting
            if index < total_students:
                if index % PAUSE_EVERY_X_EMAILS == 0:
                    log_message(f"Reached {index} emails. Pausing for {PAUSE_DURATION} seconds...")
                    time.sleep(PAUSE_DURATION)
                else:
                    time.sleep(DELAY_BETWEEN_EMAILS)
                    
    except Exception as e:
        log_message(f"Fatal SMTP connection error: {e}")
    finally:
        try:
            server.quit()
        except:
            pass
            
    log_message("=== Campaign Finished ===")
    log_message(f"Total Sent: {total_students}")
    log_message(f"Success: {success_count}")
    log_message(f"Failed: {fail_count}")

if __name__ == "__main__":
    main()
