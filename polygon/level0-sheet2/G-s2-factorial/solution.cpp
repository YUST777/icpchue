#include <bits/stdc++.h>
using namespace std;
int main(){ int t; cin>>t; while(t--){ int n; cin>>n; long long f=1; for(int i=2;i<=n;i++) f*=i; cout<<f<<"\n"; } }
