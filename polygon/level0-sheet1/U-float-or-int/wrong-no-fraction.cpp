#include <bits/stdc++.h>
using namespace std;
int main(){ double n; cin>>n; long long i=(long long)n; double f=n-i; if(f<1e-9) cout<<"int "<<i; else cout<<"float "<<i<<" "<<i; cout<<"\n"; }
