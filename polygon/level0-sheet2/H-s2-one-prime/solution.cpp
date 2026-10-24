#include <bits/stdc++.h>
using namespace std;
int main(){ int x; cin>>x; bool p=x>1; for(int i=2;1LL*i*i<=x;i++) if(x%i==0) p=false; cout<<(p?"YES":"NO")<<"\n"; }
