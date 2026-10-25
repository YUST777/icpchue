#include "testlib.h"
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    inf.readToken("[a-z]{1,20}", "F1");
    inf.readSpace();
    inf.readToken("[a-z]{1,20}", "S1");
    inf.readEoln();
    inf.readToken("[a-z]{1,20}", "F2");
    inf.readSpace();
    inf.readToken("[a-z]{1,20}", "S2");
    inf.readEoln();
    inf.readEof();
    return 0;
}
