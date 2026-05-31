#!/usr/bin/env python3
"""Generate CSV of all Yasmin (user_id=139) submissions from the database."""
import csv
import os
import psycopg2

DATABASE_URL = None
# Try to read from next-app/.env.production
env_file = "/home/ubuntu/icpchue/next-app/.env.production"
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            if line.startswith("DATABASE_URL="):
                DATABASE_URL = line.strip().split("=", 1)[1].strip('"').strip("'")
                break

if not DATABASE_URL:
    print("ERROR: Could not find DATABASE_URL")
    exit(1)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

cur.execute("""
    SELECT 
        id, user_id, source, contest_id, problem_index, verdict,
        time_ms, memory_kb, language, paste_events, tab_switches,
        time_to_solve_seconds, attempt_number, cf_submission_id, cf_handle,
        submitted_at, source_code
    FROM submissions
    WHERE user_id = 139 AND source = 'codeforces'
    ORDER BY submitted_at ASC
""")

rows = cur.fetchall()
columns = [desc[0] for desc in cur.description]

output_path = "/home/ubuntu/icpchue/yasmin_submissions.csv"
with open(output_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(columns)
    for row in rows:
        writer.writerow(row)

print(f"Written {len(rows)} submissions to {output_path}")
cur.close()
conn.close()
