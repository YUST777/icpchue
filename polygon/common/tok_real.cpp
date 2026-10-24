// Token checker: words must match exactly; numbers may differ by TOK_EPS
// (absolute or relative). Used where the original judge accepted small
// floating-point differences next to text (e.g. "float 534 0.958008").
#include "testlib.h"
#include <cstdlib>
#include <string>

#ifndef TOK_EPS
#define TOK_EPS 1e-5
#endif

static bool isNumber(const std::string& s, double& v) {
    if (s.empty()) return false;
    char* end = nullptr;
    v = std::strtod(s.c_str(), &end);
    return end && *end == '\0';
}

int main(int argc, char* argv[]) {
    registerTestlibCmd(argc, argv);
    int n = 0;
    while (!ans.seekEof()) {
        std::string j = ans.readToken();
        if (ouf.seekEof()) quitf(_wa, "too few tokens: expected '%s' at token %d", j.c_str(), n + 1);
        std::string p = ouf.readToken();
        n++;
        if (j == p) continue;
        double a, b;
        if (isNumber(j, a) && isNumber(p, b) && doubleCompare(a, b, TOK_EPS)) continue;
        quitf(_wa, "token %d: expected '%s', found '%s'", n, j.c_str(), p.c_str());
    }
    if (!ouf.seekEof()) quitf(_wa, "extra output after %d tokens", n);
    quitf(_ok, "%d tokens", n);
}
