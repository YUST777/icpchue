#include "testlib.h"
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    inf.readToken("[A-Za-z]{1,100}", "S");
    inf.readEoln();
    inf.readEof();
    return 0;
}
