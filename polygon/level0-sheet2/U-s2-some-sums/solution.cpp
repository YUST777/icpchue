#include <bits/stdc++.h>
using namespace std;
int main(){ int n,a,b; cin>>n>>a>>b; long long s=0; for(int x=1;x<=n;x++){ int d=0,y=x; while(y){ d+=y%10; y/=10; } if(d>=a&&d<=b) s+=x; } cout<<s<<"\n"; }
