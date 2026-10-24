#include "testlib.h"
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    inf.readInt(-100, 100, "A");
    inf.readSpace();
    inf.readToken("[<>=]", "S");
    inf.readSpace();
    inf.readInt(-100, 100, "B");
    inf.readEoln();
    inf.readEof();
    return 0;
}
