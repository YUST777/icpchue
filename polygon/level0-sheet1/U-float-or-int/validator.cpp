#include "testlib.h"
#include <string>
using namespace std;
static void check(const string& t, double lo, double hi, const char* name) {
    double v = stod(t);
    ensuref(v >= lo && v <= hi, "%s out of range: %s", name, t.c_str());
}
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    check(inf.readToken("[0-9]+\\.[0-9]{3}", "N"), 1, 1000, "N");
    inf.readEoln();
    inf.readEof();
    return 0;
}
