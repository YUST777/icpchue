#include <bits/stdc++.h>
using namespace std;
int main(){ int n; cin>>n; for(int x=2;x<=n;x++){ bool p=true; for(int i=2;i*i<=x;i++) if(x%i==0) p=false; if(p) cout<<x<<" "; } cout<<"\n"; }
