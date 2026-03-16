import smtplib
from email.message import EmailMessage
from email.utils import make_msgid
import os

SMTP_SERVER = 'localhost' # Connect to the exposed docker port on the host
SMTP_PORT = 25
SENDER_EMAIL = 'noreply@icpchue.com'
SENDER_NAME = 'ICPC HUE'

receiver = '8241043@horus.edu.eg'
student_name = "الطالب التجريبي" # Experimental student name

msg = EmailMessage()
msg['Subject'] = 'أهلاً بك في Orientation Day من ICPC HUE 🔥'
msg['From'] = f'{SENDER_NAME} <{SENDER_EMAIL}>'
msg['To'] = receiver

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
            <h1 style="direction: rtl; text-align: right;">أهلاً {student_name} 👋</h1>
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

# Attach NEW image (event2.webp)
image_path = '/home/ubuntu/icpchue/event2.webp'
try:
    with open(image_path, 'rb') as img:
        img_data = img.read()
    msg.get_payload()[1].add_related(img_data, 'image', 'webp', cid=image_cid)
except Exception as e:
    print(f"Failed to load image: {e}")

try:
    print(f"Connecting to SMTP server at {SMTP_SERVER}:{SMTP_PORT}...")
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        # Send raw, unauthenticated via port 25 relay
        print("Connected, sending message...")
        server.send_message(msg)
        print("Email sent successfully!")
except Exception as e:
    print(f"Failed to send email: {e}")
