#include <bits/stdc++.h>
using namespace std;
int main(){ int k,s; cin>>k>>s; long long c=0; for(int x=0;x<=k;x++) for(int y=0;y<=k;y++) for(int z=0;z<=k;z++) if(x+y+z==s) c++; cout<<c<<"\n"; }
