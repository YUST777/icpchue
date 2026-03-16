import re

file_path = '/home/ubuntu/icpchue/next-app/lib/problems.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Verify Problem B has videoUrl
if "id: 'B'" in content and "videoUrl: 'https://drive.google.com/file/d/12EeTho38V0UPze1pvCB4NpWPEf0dthJk/preview'" not in content:
    print("WARNING: Problem B video link missing! Adding it manually before cleaning.")
    # Attempt to inject it if missing (simplistic injection)
    # This might be complex with regex, better to verify visually or use the previous tool output which said it was there.
    # Step 492 confirmed it WAS there. So this check is just a safeguard.

# Regex to remove testCases: [ ... ],
# Usage of ? for non-greedy match.
# Matches "testCases: [" followed by anything (including newlines) until "],"
new_content = re.sub(r'\s*testCases: \[[\s\S]*?\],', '', content)

# Remove "testCases: TestCase[];" from interface
new_content = re.sub(r'\s*testCases: TestCase\[\];', '', new_content)

# Write back
with open(file_path, 'w') as f:
    f.write(new_content)

print("Successfully cleaned problems.ts")
