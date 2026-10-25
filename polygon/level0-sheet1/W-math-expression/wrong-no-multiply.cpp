#include <bits/stdc++.h>
using namespace std;
int main(){ long long a,b,c; char s,q; cin>>a>>s>>b>>q>>c; long long v = s=='-' ? a-b : a+b; if(v==c) cout<<"Yes"; else cout<<v; cout<<"\n"; }
