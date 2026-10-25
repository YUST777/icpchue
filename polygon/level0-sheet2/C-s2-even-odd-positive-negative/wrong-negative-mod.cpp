#include <bits/stdc++.h>
using namespace std;
int main(){ int n; cin>>n; int e=0,o=0,p=0,q=0; while(n--){ int x; cin>>x; if(x%2==1) o++; else e++; if(x>0) p++; if(x<0) q++; } cout<<"Even: "<<e<<"\nOdd: "<<o<<"\nPositive: "<<p<<"\nNegative: "<<q<<"\n"; }
