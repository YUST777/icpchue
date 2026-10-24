#include <bits/stdc++.h>
using namespace std;
int main(){ long long a,b,c; cin>>a>>b>>c; long long mx=0, mn=min({a,b,c}); mx=max({mx,a,b,c}); cout<<mn<<" "<<mx<<"\n"; }
