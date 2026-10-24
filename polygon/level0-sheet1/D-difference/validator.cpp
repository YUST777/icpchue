#include "testlib.h"
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    inf.readInt(-100000, 100000, "A");
    inf.readSpace();
    inf.readInt(-100000, 100000, "B");
    inf.readSpace();
    inf.readInt(-100000, 100000, "C");
    inf.readSpace();
    inf.readInt(-100000, 100000, "D");
    inf.readEoln();
    inf.readEof();
    return 0;
}
