#include "testlib.h"
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    inf.readInt(2, 1000000000, "A");
    inf.readSpace();
    inf.readInt(2, 1000000000, "B");
    inf.readSpace();
    inf.readInt(2, 1000000000, "C");
    inf.readSpace();
    inf.readInt(2, 1000000000, "D");
    inf.readEoln();
    inf.readEof();
    return 0;
}
