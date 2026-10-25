#include <bits/stdc++.h>
using namespace std;
int main(){ int n,m; while(cin>>n>>m){ if(n<=0||m<=0) break; if(n>m) swap(n,m); int s=0; for(int i=n;i<=m;i++){ cout<<i<<" "; s+=i; } cout<<"sum ="<<s<<"\n"; } }
