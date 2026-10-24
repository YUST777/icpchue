#include <bits/stdc++.h>
using namespace std;
int main(){ int a,b; char s; cin>>a>>s>>b; bool ok = s=='<' ? a<b : s=='>' ? a>b : a==b; cout<<(ok?"Right":"Wrong")<<"\n"; }
