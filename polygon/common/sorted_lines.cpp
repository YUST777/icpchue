// Checker for "print the answer in any order" per line: line i of the output
// must hold the same multiset of tokens as line i of the answer.
#include "testlib.h"
#include <algorithm>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

static vector<vector<string>> readLines(InStream &s) {
    vector<vector<string>> v;
    while (!s.eof()) {
        istringstream in(s.readString());
        vector<string> t;
        for (string w; in >> w;)
            t.push_back(w);
        sort(t.begin(), t.end());
        v.push_back(t);
    }
    while (!v.empty() && v.back().empty())
        v.pop_back();
    return v;
}

int main(int argc, char *argv[]) {
    registerTestlibCmd(argc, argv);
    vector<vector<string>> a = readLines(ans), o = readLines(ouf);
    if (a.size() != o.size())
        quitf(_wa, "expected %d lines, found %d", (int)a.size(), (int)o.size());
    for (size_t i = 0; i < a.size(); i++) {
        if (a[i].size() != o[i].size())
            quitf(_wa, "line %d: expected %d numbers, found %d", (int)i + 1, (int)a[i].size(), (int)o[i].size());
        if (a[i] != o[i])
            quitf(_wa, "line %d: the numbers differ from the expected ones", (int)i + 1);
    }
    quitf(_ok, "%d lines", (int)a.size());
}
