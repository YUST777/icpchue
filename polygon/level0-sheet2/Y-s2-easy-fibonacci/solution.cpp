#include <bits/stdc++.h>
using namespace std;
int main(){ int n; cin>>n; long long a=0,b=1; for(int i=0;i<n;i++){ cout<<a<<" "; long long c=a+b; a=b; b=c; } cout<<"\n"; }
