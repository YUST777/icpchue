#include "testlib.h"
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    inf.readInt(0, 100, "A");
    inf.readSpace();
    inf.readToken("[-+*]", "S");
    inf.readSpace();
    inf.readInt(0, 100, "B");
    inf.readSpace();
    inf.readToken("=", "eq");
    inf.readSpace();
    inf.readInt(-100000, 100000, "C");
    inf.readEoln();
    inf.readEof();
    return 0;
}
