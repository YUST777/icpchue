#include <bits/stdc++.h>
using namespace std;
int main(){ int a,b; cin>>a>>b; bool any=false; for(int x=a;x<=b;x++){ int y=x; bool ok=true; while(y){ if(y%10!=4&&y%10!=7) ok=false; y/=10; } if(ok){ cout<<x<<" "; any=true; } } if(!any) cout<<-1; cout<<"\n"; }
