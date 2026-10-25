// Line-by-line checker for pattern problems: every line must match exactly,
// including leading spaces. Trailing spaces/CR at line ends and trailing blank
// lines are ignored.
#include "testlib.h"
#include <string>
#include <vector>
using namespace std;

static vector<string> readLines(InStream &s) {
    vector<string> v;
    while (!s.eof()) {
        string l = s.readString();
        while (!l.empty() && (l.back() == ' ' || l.back() == '\r' || l.back() == '\t'))
            l.pop_back();
        v.push_back(l);
    }
    while (!v.empty() && v.back().empty())
        v.pop_back();
    return v;
}

int main(int argc, char *argv[]) {
    registerTestlibCmd(argc, argv);
    vector<string> a = readLines(ans), o = readLines(ouf);
    for (size_t i = 0; i < a.size() && i < o.size(); i++)
        if (a[i] != o[i])
            quitf(_wa, "line %d differs: expected '%s', found '%s'", (int)i + 1,
                  compress(a[i]).c_str(), compress(o[i]).c_str());
    if (a.size() != o.size())
        quitf(_wa, "expected %d lines, found %d", (int)a.size(), (int)o.size());
    quitf(_ok, "%d lines", (int)a.size());
}
