#include <bits/stdc++.h>
using namespace std;
int main(){ int t; cin>>t; while(t--){ int x,y; cin>>x>>y; if(x>y) swap(x,y); long long s=0; for(int i=x;i<=y;i++) if(i%2) s+=i; cout<<s<<"\n"; } }
