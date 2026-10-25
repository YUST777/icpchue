"""Single source of truth for the lesson edit: cuts, trim start, parts and their timings.

All times in `KEEP` and `PARTS[*]["start"]` are seconds in the ORIGINAL recording.
`final_time()` maps them onto the edited timeline (before title cards are inserted).
"""

SRC = "icpc-20261024_203514-Meeting Recording.mp4"
TRIM_START = 598.6          # end of the long pause just before the instructor starts (about 10:00)
END = 6906.0                # start of the post-lesson chatter we cut

# Dead air, tech problems and waiting we removed (original seconds).
CUTS = [
    (733, 741), (781, 793), (888, 899), (1396, 1427), (1672, 1905), (2463, 2566),
    (2725, 2906), (3982, 3992), (4005, 4014), (4022, 4034), (4348, 4378),
    (5659, 5684), (5963, 5987),
]

PARTS = [
    dict(en="Reading a Problem", ar="إزاي تقرأ المسألة", sub="Statement · Input · Output · Examples", start=TRIM_START),
    dict(en="If Conditions", ar="جملة الشرط if", sub="== vs = · true and false", start=1128.4),
    dict(en="Ternary Operator", ar="عامل الشرط الثلاثي", sub="condition ? yes : no", start=1267.4),
    dict(en="Switch Case", ar="جملة switch", sub="case · default · break", start=1905.0),
    dict(en="Loops and For", ar="اللوبس وحلقة for", sub="init · condition · step", start=2566.0),
    dict(en="While and Do-While", ar="حلقتا while و do-while", sub="loop until the condition fails", start=3629.8),
    dict(en="Break and Continue", ar="الأمر break و continue", sub="skip an iteration or stop the loop", start=4140.4),
    dict(en="Loop Examples", ar="أمثلة على اللوبس", sub="sum · factorial · patterns", start=4906.4),
    dict(en="Live Problem 1", ar="حل مسألة (1)", sub="solved together on Codeforces", start=5646.7),
    dict(en="Live Problem 2", ar="حل مسألة (2)", sub="even numbers and the -1 edge case", start=5956.85),
    dict(en="Assignment", ar="الواجب", sub="loops sheet · deadline next Saturday", start=6855.6),
]

CARD_SECONDS = 3.6          # length of each part title card
HEAD_SECONDS = 7.0          # lower-third window at the start of each part
AGENDA_SECONDS = 10.0


def keep_pieces():
    """Kept (start, end) pieces of the original between TRIM_START and END."""
    pieces, cur = [], TRIM_START
    for a, b in sorted(CUTS):
        if b <= TRIM_START:
            continue
        if a > cur:
            pieces.append((cur, min(a, END)))
        cur = max(cur, b)
    if cur < END:
        pieces.append((cur, END))
    return [(a, b) for a, b in pieces if b - a > 0.05]


def final_time(t):
    """Original second -> second on the edited timeline (cards not counted)."""
    acc = 0.0
    for a, b in keep_pieces():
        if t <= a:
            return acc
        if t < b:
            return acc + (t - a)
        acc += b - a
    return acc


def part_ranges():
    """[(index, original_start, original_end, final_start, final_end)]."""
    out = []
    for i, p in enumerate(PARTS):
        s = p["start"]
        e = PARTS[i + 1]["start"] if i + 1 < len(PARTS) else END
        out.append((i, s, e, final_time(s), final_time(e)))
    return out


def mmss(sec):
    sec = int(round(sec))
    return f"{sec // 60}:{sec % 60:02d}"


if __name__ == "__main__":
    total = sum(b - a for a, b in keep_pieces())
    print(f"lesson length (no cards): {mmss(total)}")
    for i, s, e, fs, fe in part_ranges():
        print(f"{i + 1:02d} {PARTS[i]['en']:<20} orig {mmss(s):>6}-{mmss(e):>6}  final {mmss(fs):>6}-{mmss(fe):>6}")
