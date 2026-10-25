#include "testlib.h"
#include <regex>
#include <string>
using namespace std;
static void check(const string& t, double lo, double hi, const char* name) {
    ensuref(regex_match(t, regex("[0-9]+(\\.[0-9]+)?")), "%s is not a plain decimal number", t.c_str());
    double v = stod(t);
    ensuref(v >= lo && v <= hi, "%s out of range: %s", name, t.c_str());
}
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    check(inf.readToken("[0-9.]+", "R"), 1, 100, "R");
    inf.readEoln();
    inf.readEof();
    return 0;
}
