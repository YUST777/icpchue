// Whitespace-exact checker, like the original judge: every line must match
// character for character (stray or doubled spaces, leading/trailing spaces and
// extra blank lines are wrong). Only a missing final newline, CR at line ends and
// trailing blank lines at the end of the output are ignored.
// With TOK_EPS defined, numeric words may differ by that much; all else is exact.
#include "testlib.h"
#include <cstdlib>
#include <string>
#include <vector>
using namespace std;

static vector<string> readLines(InStream &s) {
    vector<string> v;
    while (!s.eof()) {
        string l = s.readString();
        while (!l.empty() && l.back() == '\r') l.pop_back();
        v.push_back(l);
    }
    while (!v.empty() && v.back().empty()) v.pop_back();
    return v;
}

static vector<string> words(const string &l) {
    vector<string> w(1);
    for (char c : l) { if (c == ' ') w.emplace_back(); else w.back() += c; }
    return w;
}

#ifdef TOK_EPS
static bool isNumber(const string &s, double &v) {
    if (s.empty()) return false;
    char *end = nullptr;
    v = strtod(s.c_str(), &end);
    return end && *end == '\0';
}
#endif

static bool sameWord(const string &a, const string &b) {
    if (a == b) return true;
#ifdef TOK_EPS
    double x, y;
    return isNumber(a, x) && isNumber(b, y) && doubleCompare(x, y, TOK_EPS);
#else
    return false;
#endif
}

int main(int argc, char *argv[]) {
    registerTestlibCmd(argc, argv);
    vector<string> a = readLines(ans), o = readLines(ouf);
    for (size_t i = 0; i < a.size() && i < o.size(); i++) {
        vector<string> wa = words(a[i]), wo = words(o[i]);
        bool ok = wa.size() == wo.size();
        for (size_t j = 0; ok && j < wa.size(); j++) ok = sameWord(wa[j], wo[j]);
        if (!ok)
            quitf(_wa, "line %d differs: expected '%s', found '%s'", (int)i + 1,
                  compress(a[i]).c_str(), compress(o[i]).c_str());
    }
    if (a.size() != o.size())
        quitf(_wa, "expected %d lines, found %d", (int)a.size(), (int)o.size());
    quitf(_ok, "%d lines", (int)a.size());
}
