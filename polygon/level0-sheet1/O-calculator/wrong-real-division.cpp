#include <bits/stdc++.h>
using namespace std;
int main(){ long long a,b; char s; cin>>a>>s>>b; if(s=='+') cout<<a+b; else if(s=='-') cout<<a-b; else if(s=='*') cout<<a*b; else cout<<(double)a/b; cout<<"\n"; }
