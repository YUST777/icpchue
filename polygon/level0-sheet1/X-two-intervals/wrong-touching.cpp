#include <bits/stdc++.h>
using namespace std;
int main(){ long long a,b,c,d; cin>>a>>b>>c>>d; long long l=max(a,c), h=min(b,d); if(l<h) cout<<l<<" "<<h; else cout<<-1; cout<<"\n"; }
