#include "testlib.h"
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    inf.readToken("[0-9A-Za-z]", "X");
    inf.readEoln();
    inf.readEof();
    return 0;
}
