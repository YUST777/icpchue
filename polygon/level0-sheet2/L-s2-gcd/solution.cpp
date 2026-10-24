#include <bits/stdc++.h>
using namespace std;
int main(){ int a,b; cin>>a>>b; while(b){ int t=a%b; a=b; b=t; } cout<<a<<"\n"; }
