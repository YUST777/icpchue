import sys
import json
import math
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
import os
import arabic_reshaper
from bidi.algorithm import get_display

def process_text(text):
    if not text: return text
    try:
        reshaped_text = arabic_reshaper.reshape(text)
        bidi_text = get_display(reshaped_text)
        return bidi_text
    except:
        return text

def safe_get(data, key, default):
    val = data.get(key)
    return val if val is not None else default

def is_arabic(text):
    if not text: return False
    for char in text:
        # Check standard and presentation forms buckets
        # Basic Arabic: 0600-06FF, Supplement: 0750-077F, ExtA: 08A0-08FF
        # Presentation A: FB50-FDFF, Presentation B: FE70-FEFF
        code = ord(char)
        if (0x0600 <= code <= 0x06FF) or (0xFB50 <= code <= 0xFDFF) or (0xFE70 <= code <= 0xFEFF):
            return True
    return False

def create_gradient_vertical(width, height, start_color, end_color):
    base = Image.new('RGB', (width, height), start_color)
    top = Image.new('RGB', (width, height), end_color)
    mask = Image.new('L', (width, height))
    mask_data = []
    for y in range(height):
        # easing
        ratio = y / height
        # ease out quad
        # ratio = 1 - (1 - ratio) * (1 - ratio)
        mask_data.extend([int(255 * ratio)] * width)
    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base

def draw_rounded_rect_with_glow(draw, xy, cornerradius, fill, outline, width, glow_color=None):
    # Simulating glow by drawing larger transparent rects? 
    # PIL drawing is limited. Let's stick to clean borders.
    if glow_color:
        # Draw explicit glow rects
        x0, y0, x1, y1 = xy
        for i in range(4, 0, -1):
            alpha = int(10 * (1 - i/5))
            # expand
            g = i
            draw.rounded_rectangle([x0-g, y0-g, x1+g, y1+g], radius=cornerradius+i, outline=(glow_color[0], glow_color[1], glow_color[2], alpha), width=1)

    draw.rounded_rectangle(xy, radius=cornerradius, fill=fill, outline=outline, width=width)

def main():
    try:
        input_arg = sys.argv[1]
        output_path = sys.argv[2]
        
        if os.path.exists(input_arg):
            with open(input_arg, 'r') as f:
                data = json.load(f)
        else:
            data = json.loads(input_arg)
    except Exception as e:
        print(f"Error parsing input: {e}")
        sys.exit(1)

    # Config - Modern Dark Theme
    W, H = 800, 1200
    BG_TOP = (15, 15, 15)
    BG_BOTTOM = (5, 5, 5)
    
    GOLD_PRIMARY = (232, 193, 90)
    GOLD_DIM = (180, 140, 50)
    GOLD_BG = (232, 193, 90, 20) # Low opacity
    
    WHITE = (255, 255, 255)
    GRAY_LIGHT = (200, 200, 200)
    GRAY_DIM = (120, 120, 120)
    
    # Fonts
    # Using Outfit fonts we just downloaded
    FONT_PATH = "public/fonts/Outfit-Regular.ttf"
    FONT_BOLD_PATH = "public/fonts/Outfit-Bold.ttf"
    
    def get_font(path, size):
        try:
            # Check relative to cwd
            full_path = os.path.join(os.getcwd(), path)
            if not os.path.exists(full_path):
                 # Fallback to system font if custom font fails
                 return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
            return ImageFont.truetype(full_path, size)
        except:
            return ImageFont.load_default()

    font_display = get_font(FONT_BOLD_PATH, 72)
    font_h1 = get_font(FONT_BOLD_PATH, 48)
    font_h2 = get_font(FONT_BOLD_PATH, 36)
    font_number = get_font(FONT_BOLD_PATH, 55)
    font_body = get_font(FONT_PATH, 24)
    font_small = get_font(FONT_PATH, 18)
    font_mini = get_font(FONT_BOLD_PATH, 14)

    # Arabic Fallback Fonts
    ARABIC_FONT_PATH = "/usr/share/fonts/noto/NotoSansArabic-Regular.ttf"
    ARABIC_FONT_BOLD_PATH = "/usr/share/fonts/noto/NotoSansArabic-Bold.ttf"
    
    def get_arabic_font(size, bold=False):
        path = ARABIC_FONT_BOLD_PATH if bold else ARABIC_FONT_PATH
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
        return get_font(FONT_BOLD_PATH if bold else FONT_PATH, size)

    font_arabic_h1 = get_arabic_font(48, bold=True)
    font_arabic_display = get_arabic_font(72, bold=True)
    font_arabic_number = get_arabic_font(55, bold=True)
    font_arabic_body = get_arabic_font(24, bold=False)

    # Base Canvas
    im = create_gradient_vertical(W, H, BG_TOP, BG_BOTTOM)
    draw = ImageDraw.Draw(im, 'RGBA')

    # Add Noise/Texture (Simulated with dots or overlay)
    # Skipping heavy noise for performance, just clean gradient
    
    # Top Logo Area
    logo_file = 'public/icpchue-logo.webp'
    logo_y = 50
    if os.path.exists(logo_file):
        try:
            logo = Image.open(logo_file).convert("RGBA")
            logo = logo.resize((60, 60), Image.Resampling.LANCZOS)
            im.paste(logo, (50, logo_y), logo)
        except:
            pass
    
    draw.text((125, logo_y + 12), "ICPC HUE", font=get_font(FONT_BOLD_PATH, 28), fill=WHITE)
    draw.text((280, logo_y + 12), "|", font=get_font(FONT_PATH, 28), fill=GRAY_DIM)
    draw.text((310, logo_y + 12), "REWIND 2025", font=get_font(FONT_PATH, 28), fill=GOLD_PRIMARY)

    # Greeting Section
    username = safe_get(data, 'username', 'User')
    draw.text((50, 160), "Hi", font=font_h1, fill=GRAY_LIGHT)
    u_text = process_text(username)
    u_font = font_arabic_h1 if is_arabic(username) else font_h1
    draw.text((120, 160), u_text + ",", font=u_font, fill=WHITE)
    
    days = safe_get(data, 'daysActive', 0)
    
    # Draw a highlight box for days
    # "You've been coding for X days"
    draw.text((50, 230), "It's been", font=font_h2, fill=GRAY_DIM)
    
    # Special gold text for number
    # Measure text
    w_prefix = draw.textlength("It's been ", font=font_h2)
    draw.text((50 + w_prefix, 230), f"{days} days", font=font_h2, fill=GOLD_PRIMARY)
    w_days = draw.textlength(f"{days} days", font=font_h2)
    draw.text((50 + w_prefix + w_days + 10, 230), "with us.", font=font_h2, fill=GRAY_DIM)

    # ---------------------------------------------------------
    # STATS CARDS (2x2)
    # ---------------------------------------------------------
    start_y = 340
    margin = 50
    grid_gap = 20
    card_w = (W - (margin * 2) - grid_gap) // 2
    card_h = 180
    
    stats_data = [
        {
            "label": "TOTAL SOLVED",
            "value": str(safe_get(data, 'totalSolved', 0)),
            "sub": "Problems",
            "icon_color": GOLD_PRIMARY
        },
        {
            "label": "MAX STREAK",
            "value": str(safe_get(data, 'maxStreak', 0)),
            "sub": "Day Streak",
            "icon_color": (100, 200, 255) # Blue-ish
        },
        {
            "label": "GLOBAL RANK",
            # If user sees "Top 6%" in image and "94% above" in website, they are consistent.
            # But user is confused. I will change label to "Better Than" and calculation to `100 - percentile`.
            "value": f"Better than {100 - data.get('rankPercentile', 100)}%",
            "sub": "of users",
            "icon_color": (100, 255, 150) # Green-ish
        }
    ]
    
    # 4th stat: Top Skill
    top_tags = safe_get(data, 'topTags', [])
    skill_val = process_text(top_tags[0]['tag'].title()) if top_tags and len(top_tags) > 0 else "General"
    stats_data.append({
        "label": "TOP SKILL",
        "value": skill_val,
        "sub": "Most Practiced",
        "icon_color": (255, 100, 150) # Pink-ish
    })

    for i, item in enumerate(stats_data):
        row = i // 2
        col = i % 2
        cx = margin + col * (card_w + grid_gap)
        cy = start_y + row * (card_h + grid_gap)
        
        # Card Background (Glassy look)
        draw_rounded_rect_with_glow(draw, [cx, cy, cx+card_w, cy+card_h], 15, fill=(30, 30, 30, 255), outline=(60, 60, 60, 255), width=1, glow_color=None)
        
        # Top Label - Use Bold Font now
        draw.text((cx + 25, cy + 25), item['label'], font=font_small, fill=GRAY_DIM)
        
        # Main Value
        val_str = item['value']
        used_font = font_number
        if len(val_str) > 8: used_font = font_h2
        if len(val_str) > 12: used_font = font_body
        
        if is_arabic(val_str):
             if used_font == font_number: used_font = font_arabic_number
             elif used_font == font_h2: used_font = get_arabic_font(36, bold=True)
             else: used_font = font_arabic_body
        
        draw.text((cx + 25, cy + 55), val_str, font=used_font, fill=WHITE)
        
        # Sub label - Use Bold/Medium for better readability
        draw.text((cx + 25, cy + 130), item['sub'], font=font_small, fill=GRAY_DIM)
        
        # Accent Line
        draw.line([cx + 25, cy + 50, cx + 55, cy + 50], fill=item['icon_color'], width=2)


    # ---------------------------------------------------------
    # TOP PROBLEM (Wide Card)
    # ---------------------------------------------------------
    prob_y = start_y + 2 * (card_h + grid_gap) + 20
    prob_h = 200
    prob_w = W - (margin * 2)
    
    # Background
    draw_rounded_rect_with_glow(draw, [margin, prob_y, margin+prob_w, prob_y+prob_h], 15, fill=(25, 25, 25, 255), outline=(50, 50, 50, 255), width=1)
    
    # Label
    draw.text((margin + 30, prob_y + 30), "MOST ATTEMPTED PROBLEM", font=font_mini, fill=GRAY_DIM)
    
    # Problem Name
    prob_name = safe_get(data, 'topProblem', 'N/A')
    p_text = process_text(prob_name)
    p_font = font_arabic_display if is_arabic(prob_name) else font_display
    draw.text((margin + 30, prob_y + 60), p_text, font=p_font, fill=WHITE)
    
    # Attempts bubble - Make it smaller
    attempts = safe_get(data, 'topProblemAttempts', 0)
    att_text = f"{attempts} Attempts"
    
    # Draw rounded pill for attempts
    text_bbox = draw.textbbox((0,0), att_text, font=font_small) # Use smaller font for pill
    pill_w = text_bbox[2] - text_bbox[0] + 30
    pill_h = 32 # Smaller height
    pill_x = margin + 30
    pill_y = prob_y + 140
    
    draw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=16, fill=(232, 193, 90, 40), outline=GOLD_PRIMARY, width=1)
    draw.text((pill_x + 15, pill_y + 5), att_text, font=font_small, fill=GOLD_PRIMARY)


    # ---------------------------------------------------------
    # ACHIEVEMENTS SECTION
    # ---------------------------------------------------------
    ach_y = prob_y + prob_h + 50
    draw.text((margin, ach_y), "ACHIEVEMENTS UNLOCKED", font=font_small, fill=GRAY_DIM)
    
    achievements = safe_get(data, 'achievements', [])
    
    # Layout achievements in a row
    ach_start_y = ach_y + 40
    ach_size = 90
    ach_gap = 20 # Squeeze slightly to fit 6
    
    current_x = margin
    
    for ach in achievements[:6]: # Max 6
        try:
            img_rel_path = ach.get('image', '')
            if img_rel_path.startswith('/'): img_rel_path = img_rel_path[1:]
            img_path = os.path.join(os.getcwd(), 'public', img_rel_path)
            
            if os.path.exists(img_path):
                # Draw container
                draw_rounded_rect_with_glow(draw, [current_x, ach_start_y, current_x+ach_size, ach_start_y+ach_size], 15, fill=(20, 20, 20, 255), outline=(50, 50, 50, 255), width=1)
                
                ach_img = Image.open(img_path).convert("RGBA")
                ach_img = ach_img.resize((ach_size-20, ach_size-20), Image.Resampling.LANCZOS)
                im.paste(ach_img, (current_x+10, ach_start_y+10), ach_img)
            else:
                # Placeholder box
                draw.rounded_rectangle([current_x, ach_start_y, current_x+ach_size, ach_start_y+ach_size], radius=15, outline=GRAY_DIM)
            
            # Label below?
            # draw.text((current_x, ach_start_y + ach_size + 10), ach['title'][:10] + '..', font=font_mini, fill=GRAY_DIM)
            
            current_x += ach_size + ach_gap
        except Exception as e:
            print(e)
            pass

    # Footer
    # Removed line as requested
    # draw.line([margin, H - 90, W - margin, H - 90], fill=(40, 40, 40), width=1)
    
    # Right aligned text
    footer_text = "Generated on ICPCHUE.COM"
    bbox = draw.textbbox((0,0), footer_text, font=font_small)
    text_w = bbox[2] - bbox[0]
    draw.text((W - margin - text_w, H - 60), footer_text, font=font_small, fill=GRAY_DIM)
    
    # Save
    im.save(output_path)

if __name__ == "__main__":
    main()
