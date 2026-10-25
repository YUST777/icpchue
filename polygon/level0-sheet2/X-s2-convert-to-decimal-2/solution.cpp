#include <bits/stdc++.h>
using namespace std;
int main(){ int t; cin>>t; while(t--){ long long n; cin>>n; int k=0; while(n){ k+=n&1; n>>=1; } cout<<(1LL<<k)-1<<"\n"; } }
