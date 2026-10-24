#include "testlib.h"
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    int l1 = inf.readInt(1, 1000000000, "l1");
    inf.readSpace();
    int r1 = inf.readInt(l1, 1000000000, "r1");
    inf.readSpace();
    int l2 = inf.readInt(1, 1000000000, "l2");
    inf.readSpace();
    inf.readInt(l2, 1000000000, "r2");
    inf.readEoln();
    inf.readEof();
    return 0;
}
