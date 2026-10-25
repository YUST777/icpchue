#include "testlib.h"
#include <string>
using namespace std;
#include <cstdio>
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    string t = inf.readToken("[0-9]+[-+*/][0-9]+", "expression");
    long long a, b; char s;
    ensuref(sscanf(t.c_str(), "%lld%c%lld", &a, &s, &b) == 3, "bad expression");
    ensuref(a >= 1 && a <= 10000 && b >= 1 && b <= 10000, "operand out of range");
    inf.readEoln();
    inf.readEof();
    return 0;
}
