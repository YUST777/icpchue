#include <bits/stdc++.h>
using namespace std;
int main(){ long long n; cin>>n; long long r=0,m=n; while(m){ r=r*10+m%10; m/=10; } cout<<r<<"\n"<<(r==n?"YES":"NO")<<"\n"; }
