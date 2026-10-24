#include "testlib.h"
#include <string>
#include <cmath>

// A real number written as [-]digits[.digits] with at most `intDigits`
// integer digits and `fracDigits` decimals (keeps cout output free of
// scientific notation at its default 6 significant digits).
static void readReal(const char* name, int intDigits, int fracDigits) {
    std::string s = inf.readToken("[-.0-9]{1,16}", name);
    size_t i = 0;
    if (s[0] == '-') i = 1;
    size_t dot = s.find('.');
    std::string ip = s.substr(i, dot == std::string::npos ? std::string::npos : dot - i);
    std::string fp = dot == std::string::npos ? "" : s.substr(dot + 1);
    ensuref(!ip.empty() && (int)ip.size() <= intDigits, "%s: bad integer part in '%s'", name, s.c_str());
    ensuref(ip.find_first_not_of("0123456789") == std::string::npos, "%s: bad digits in '%s'", name, s.c_str());
    ensuref(dot == std::string::npos || (!fp.empty() && (int)fp.size() <= fracDigits
            && fp.find_first_not_of("0123456789") == std::string::npos), "%s: bad decimals in '%s'", name, s.c_str());
    // Values below 1e-4 would print in scientific notation (e.g. 1e-05).
    double v = std::stod(s);
    ensuref(v == 0 || std::fabs(v) >= 1e-4, "%s: '%s' is too close to zero", name, s.c_str());
}

int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    inf.readInt(INT_MIN, INT_MAX, "i");
    inf.readSpace();
    inf.readLong(LLONG_MIN, LLONG_MAX, "l");
    inf.readSpace();
    inf.readToken("[!-~]", "c");
    inf.readSpace();
    readReal("f", 5, 2);
    inf.readSpace();
    readReal("d", 5, 6);
    inf.readEoln();
    inf.readEof();
    return 0;
}
