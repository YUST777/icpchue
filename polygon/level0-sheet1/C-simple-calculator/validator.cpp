#include "testlib.h"
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    inf.readInt(1, 100000, "X");
    inf.readSpace();
    inf.readInt(1, 100000, "Y");
    inf.readEoln();
    inf.readEof();
    return 0;
}
