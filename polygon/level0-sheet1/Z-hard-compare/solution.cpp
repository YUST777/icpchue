#include <bits/stdc++.h>
using namespace std;

// Smallest base r with x = r^k; returns {r, k}.
pair<long long,long long> root(long long x){
    for(long long k=40;k>=2;k--){
        long long r=llround(pow(static_cast<double>(x),1.0/static_cast<double>(k)));
        for(long long c=max(2LL,r-1);c<=r+1;c++){ long long v=1; bool over=false;
            for(int i=0;i<k;i++){ if(v>x/c){over=true;break;} v*=c; }
            if(!over&&v==x) return {c,k}; }
    }
    return {x,1};
}
int main(){
    long long a,b,c,d; cin>>a>>b>>c>>d;
    if(a==1){ cout<<"NO\n"; return 0; }          // 1 > C^D never holds
    if(c==1){ cout<<"YES\n"; return 0; }         // A^B >= 2 > 1
    auto [ra,ka]=root(a); auto [rc,kc]=root(c);
    if(ra==rc){ // same base: compare exponents exactly
        long long ea=ka*b, ec=kc*d; // <= 40*1e12, fits
        cout<<(ea>ec?"YES":"NO")<<"\n"; return 0;
    }
    long double l=(long double)b*logl((long double)a), r=(long double)d*logl((long double)c);
    cout<<(l>r?"YES":"NO")<<"\n";
}
