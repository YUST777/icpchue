"""ICPC HUE Level 0, Sheet 3 (Arrays), problems A-Z.

Same tasks, formats and samples as the training sheet; statements in our own
words.

    python3 polygon/build.py polygon/sheets/level0_C.py polygon/level0-sheet3
"""

CPP = '#include <bits/stdc++.h>\nusing namespace std;\n'
WCMP = 'std::wcmp.cpp'
ANY_ORDER = {'custom': 'sorted_lines'}


def ri(rng, lo, hi):
    return rng.randint(lo, hi)


def nums(rng, n, lo, hi):
    return ' '.join(str(rng.randint(lo, hi)) for _ in range(n))


def arr(rng, n, lo, hi):
    return f'{n}\n{nums(rng, n, lo, hi)}'


def multi(cases):
    return f'{len(cases)}\n' + '\n'.join(cases)


PROBLEMS = []


def P(**kw):
    PROBLEMS.append(kw)


def ARR_IN(nmax, lo, hi, nmin='1'):
    return (f'The first line contains $N$ (${nmin} \\le N \\le {nmax}$), the number of elements. The second line contains '
            f'$N$ integers $A_i$ (${lo} \\le A_i \\le {hi}$).')


# ---------------------------------------------------------------- A
P(letter='A', name='s3-summation', title='Summation', tl=2000, ml=64, checker=WCMP,
  legend='You are given an array $A$ of $N$ integers. Print the absolute value of their sum.',
  input=ARR_IN('10^5', '-10^9', '10^9'),
  output='Print $|A_1 + A_2 + \\ldots + A_N|$.',
  notes='In the second example $-1 + 2 + (-3) = -2$, and $|-2| = 2$.',
  samples=[('4\n7 2 1 3', '13'), ('3\n-1 2 -3', '2')],
  solution=CPP + 'int main(){ int n; cin>>n; long long s=0; while(n--){ long long x; cin>>x; s+=x; } cout<<llabs(s)<<"\\n"; }\n',
  wrong={'wrong-int.cpp': CPP + 'int main(){ int n; cin>>n; int s=0; while(n--){ int x; cin>>x; s+=x; } cout<<abs(s)<<"\\n"; }\n'},
  gen=lambda r: ['1\n0', '1\n-1000000000', '1\n1000000000', '100000\n' + ' '.join(['1000000000'] * 100000),
                 '100000\n' + ' '.join(['-1000000000'] * 100000), '2\n-5 5', arr(r, 100000, -10**9, 10**9),
                 arr(r, 100000, -10**9, 10**7), arr(r, 1000, -10, 10)]
                + [arr(r, ri(r, 1, 1000), -10**9, 10**9) for _ in range(3)])


# ---------------------------------------------------------------- B
def gen_search(r):
    t = ['1\n5\n5', '1\n5\n6', '5\n0 0 0 0 0\n0', '3\n1 2 3\n3', '3\n1000000000 7 1000000000\n1000000000']
    big = [ri(r, 0, 10**9) for _ in range(100000)]
    t.append(f'100000\n{" ".join(map(str, big))}\n{big[-1]}')
    t.append(f'100000\n{" ".join(map(str, big))}\n{big[54321]}')
    t.append(f'100000\n{" ".join(str(ri(r, 0, 100)) for _ in range(100000))}\n1000')
    for _ in range(3):
        n = ri(r, 1, 50)
        t.append(f'{n}\n{nums(r, n, 0, 10)}\n{ri(r, 0, 10)}')
    return t


P(letter='B', name='s3-searching', title='Searching', tl=2000, ml=64, checker=WCMP,
  legend='You are given an array $A$ of $N$ integers and an integer $X$. Print the position (0-indexed) of the first '
         'occurrence of $X$ in $A$, or $-1$ if $X$ does not occur.',
  input='The first line contains $N$ ($1 \\le N \\le 10^5$). The second line contains $N$ integers $A_i$ '
        '($0 \\le A_i \\le 10^9$). The third line contains $X$ ($0 \\le X \\le 10^9$).',
  output='Print the first position of $X$, or $-1$.',
  samples=[('3\n3 0 1\n0', '1'), ('5\n1 3 0 4 5\n10', '-1'), ('4\n2 3 2 1\n2', '0')],
  solution=CPP + 'int main(){ int n; cin>>n; vector<long long> a(n); for(auto&x:a) cin>>x; long long x; cin>>x; '
                 'for(int i=0;i<n;i++) if(a[i]==x){ cout<<i<<"\\n"; return 0; } cout<<-1<<"\\n"; }\n',
  wrong={'wrong-last.cpp': CPP + 'int main(){ int n; cin>>n; vector<long long> a(n); for(auto&x:a) cin>>x; long long x; cin>>x; '
                                 'int p=-1; for(int i=0;i<n;i++) if(a[i]==x) p=i; cout<<p<<"\\n"; }\n'},
  gen=gen_search)

# ---------------------------------------------------------------- C
P(letter='C', name='s3-replacement', title='Replacement', tl=1000, ml=256, checker=WCMP,
  legend='You are given an array $A$ of $N$ integers. Replace every positive number by $1$ and every negative number '
         'by $2$ (zeros stay), then print the array.',
  input=ARR_IN('1000', '-10^5', '10^5', '2'),
  output='Print the new array, separated by spaces.',
  samples=[('5\n1 -2 0 3 4', '1 2 0 1 1')],
  solution=CPP + 'int main(){ int n; cin>>n; while(n--){ int x; cin>>x; cout<<(x>0?1:x<0?2:0)<<" "; } cout<<"\\n"; }\n',
  gen=lambda r: ['2\n0 0', '2\n-100000 100000', '3\n-1 0 1', arr(r, 1000, -100000, 100000), arr(r, 1000, -1, 1)]
                + [arr(r, ri(r, 2, 1000), -100000, 100000) for _ in range(3)])


# ---------------------------------------------------------------- D
def gen_positions(r):
    t = ['2\n10 11', '2\n-100000 100000', '3\n10 10 10', '5\n11 12 13 14 10']
    for n, lo, hi in ((1000, -100000, 100000), (1000, 0, 20), (1000, 11, 100000)):
        a = [ri(r, lo, hi) for _ in range(n)]
        if min(a) > 10:
            a[ri(r, 0, n - 1)] = ri(r, -100000, 10)
        t.append(f'{n}\n{" ".join(map(str, a))}')
    return t


P(letter='D', name='s3-positions-in-array', title='Positions in Array', tl=1000, ml=256, checker=WCMP,
  legend='You are given an array $A$ of $N$ integers. For every position $i$ (0-indexed) whose value is at most $10$, '
         'print the position and the value.',
  input=ARR_IN('1000', '-10^5', '10^5', '2') + ' At least one value is at most $10$.',
  output='For each such position, in increasing order, print a line "A[$i$] = $X$", where $X = A_i$.',
  samples=[('5\n1 2 100 0 30', 'A[0] = 1\nA[1] = 2\nA[3] = 0')],
  solution=CPP + 'int main(){ int n; cin>>n; for(int i=0;i<n;i++){ int x; cin>>x; if(x<=10) cout<<"A["<<i<<"] = "<<x<<"\\n"; } }\n',
  gen=gen_positions)

# ---------------------------------------------------------------- E
P(letter='E', name='s3-lowest-number', title='Lowest Number', tl=1000, ml=256, checker=WCMP,
  legend='You are given an array $A$ of $N$ integers. Print its smallest value and the position (1-indexed) of its '
         'first occurrence.',
  input=ARR_IN('1000', '-10^5', '10^5', '2'),
  output='Print the minimum and its first position, separated by a space.',
  samples=[('3\n1 2 3', '1 1'), ('5\n5 6 2 3 2', '2 3')],
  solution=CPP + 'int main(){ int n; cin>>n; int m=INT_MAX,p=0; for(int i=1;i<=n;i++){ int x; cin>>x; if(x<m){ m=x; p=i; } } '
                 'cout<<m<<" "<<p<<"\\n"; }\n',
  wrong={'wrong-last.cpp': CPP + 'int main(){ int n; cin>>n; int m=INT_MAX,p=0; for(int i=1;i<=n;i++){ int x; cin>>x; '
                                 'if(x<=m){ m=x; p=i; } } cout<<m<<" "<<p<<"\\n"; }\n'},
  gen=lambda r: ['2\n7 7', '2\n100000 -100000', '4\n-100000 0 -100000 0', '3\n5 4 3', '1000\n' + ' '.join(['100000'] * 1000),
                 arr(r, 1000, -100000, 100000), arr(r, 1000, -3, 3), arr(r, 1000, 1, 100000)]
                + [arr(r, ri(r, 2, 1000), -100000, 100000) for _ in range(3)])

# ---------------------------------------------------------------- F
P(letter='F', name='s3-reversing', title='Reversing', tl=1000, ml=64, checker=WCMP,
  legend='You are given an array $A$ of $N$ integers. Print it in reverse order, without using a built-in reverse function.',
  input=ARR_IN('10^3', '0', '10^9'),
  output='Print $A_N, A_{N-1}, \\ldots, A_1$ separated by spaces.',
  samples=[('4\n5 1 3 2', '2 3 1 5'), ('5\n1 2 3 4 5', '5 4 3 2 1')],
  solution=CPP + 'int main(){ int n; cin>>n; vector<long long> a(n); for(auto&x:a) cin>>x; for(int i=n-1;i>=0;i--) cout<<a[i]<<" "; cout<<"\\n"; }\n',
  gen=lambda r: ['1\n0', '1\n1000000000', '2\n1 2', arr(r, 1000, 0, 10**9), arr(r, 1000, 0, 9)]
                + [arr(r, ri(r, 1, 1000), 0, 10**9) for _ in range(3)])


# ---------------------------------------------------------------- G
def gen_pal(r):
    def pal(n, hi):
        h = [ri(r, 1, hi) for _ in range((n + 1) // 2)]
        return h + h[:n // 2][::-1]
    t = ['1\n1', '2\n1 1', '2\n1 2', '3\n1 2 1', '3\n1 2 2']
    for n in (100000, 99999, 1000):
        a = pal(n, 10**9)
        t.append(f'{n}\n{" ".join(map(str, a))}')
        a[n // 2 - 1] += 1   # break it near the middle
        t.append(f'{n}\n{" ".join(map(str, a))}')
    a = pal(100000, 10**9)
    a[0] = a[-1] + 1 if a[-1] < 10**9 else 1
    t.append(f'100000\n{" ".join(map(str, a))}')
    t.append(arr(r, 100000, 1, 10**9))
    return t


P(letter='G', name='s3-palindrome-array', title='Palindrome Array', tl=1000, ml=256, checker=WCMP,
  legend='You are given an array $A$ of $N$ integers. Decide whether it is a palindrome: it reads the same forwards '
         'and backwards. For example $\\{1\\}$ and $\\{1, 2, 3, 2, 1\\}$ are palindromes, but $\\{1, 12\\}$ and '
         '$\\{4, 7, 5, 4\\}$ are not.',
  input=ARR_IN('10^5', '1', '10^9'),
  output='Print "YES" if $A$ is a palindrome, otherwise "NO".',
  samples=[('5\n1 3 2 3 1', 'YES'), ('4\n1 2 3 4', 'NO')],
  solution=CPP + 'int main(){ int n; cin>>n; vector<long long> a(n); for(auto&x:a) cin>>x; bool ok=true; '
                 'for(int i=0;i<n;i++) if(a[i]!=a[n-1-i]) ok=false; cout<<(ok?"YES":"NO")<<"\\n"; }\n',
  wrong={'wrong-ends-only.cpp': CPP + 'int main(){ int n; cin>>n; vector<long long> a(n); for(auto&x:a) cin>>x; '
                                      'cout<<(a[0]==a[n-1]?"YES":"NO")<<"\\n"; }\n'},
  gen=gen_pal)

# ---------------------------------------------------------------- H
P(letter='H', name='s3-sorting', title='Sorting', tl=1000, ml=64, checker=WCMP,
  legend='You are given an array $A$ of $N$ integers. Print it sorted in non-decreasing order. Try to write the '
         'sorting yourself (bubble sort or selection sort) instead of using a built-in function.',
  input='The first line contains $N$ ($0 < N < 10^3$). The second line contains $N$ integers $A_i$ ($-100 \\le A_i \\le 100$).',
  output='Print the sorted array, separated by spaces.',
  samples=[('3\n3 1 2', '1 2 3'), ('4\n5 2 7 3', '2 3 5 7')],
  solution=CPP + 'int main(){ int n; cin>>n; vector<int> a(n); for(auto&x:a) cin>>x; sort(a.begin(),a.end()); '
                 'for(int x:a) cout<<x<<" "; cout<<"\\n"; }\n',
  gen=lambda r: ['1\n-100', '2\n2 1', '5\n0 0 0 0 0', '999\n' + ' '.join(str(100 - i % 201) for i in range(999)),
                 arr(r, 999, -100, 100), arr(r, 999, -2, 2)]
                + [arr(r, ri(r, 1, 999), -100, 100) for _ in range(3)])

# ---------------------------------------------------------------- I
P(letter='I', name='s3-smallest-pair', title='Smallest Pair', tl=1000, ml=256, checker=WCMP,
  legend='You are given an array $A$ of $N$ integers. Print the smallest possible value of $A_i + A_j + j - i$ over '
         'all pairs $1 \\le i < j \\le N$.',
  input='The first line contains $T$ ($1 \\le T \\le 100$), the number of test cases. Each test case has two lines: '
        '$N$ ($2 \\le N \\le 100$), then $N$ integers $A_i$ ($-10^6 \\le A_i \\le 10^6$).',
  output='For each test case print the answer on its own line.',
  notes='In the example the best pair is $i = 2$, $j = 4$: $1 + 4 + 4 - 2 = 7$.',
  samples=[('1\n4\n20 1 9 4', '7')],
  solution=CPP + 'int main(){ int t; cin>>t; while(t--){ int n; cin>>n; vector<long long> a(n+1); for(int i=1;i<=n;i++) cin>>a[i]; '
                 'long long b=LLONG_MAX; for(int i=1;i<=n;i++) for(int j=i+1;j<=n;j++) b=min(b,a[i]+a[j]+j-i); cout<<b<<"\\n"; } }\n',
  wrong={'wrong-adjacent.cpp': CPP + 'int main(){ int t; cin>>t; while(t--){ int n; cin>>n; vector<long long> a(n+1); '
                                     'for(int i=1;i<=n;i++) cin>>a[i]; long long b=LLONG_MAX; for(int i=1;i<n;i++) '
                                     'b=min(b,a[i]+a[i+1]+1); cout<<b<<"\\n"; } }\n'},
  gen=lambda r: [multi(['2\n-1000000 -1000000']), multi(['2\n1000000 1000000']), multi(['3\n5 100 5', '3\n-5 100 -5']),
                 multi([arr(r, 100, -10**6, 10**6) for _ in range(100)]), multi([arr(r, 100, -10, 10) for _ in range(100)]),
                 multi([arr(r, ri(r, 2, 100), -10**6, 10**6) for _ in range(30)])])

# ---------------------------------------------------------------- J
P(letter='J', name='s3-lucky-array', title='Lucky Array', tl=1000, ml=256, checker=WCMP,
  legend='You are given an array $A$ of $N$ integers. The array is lucky if its minimum value occurs an odd number '
         'of times. Decide whether it is lucky.',
  input=ARR_IN('1000', '-10^5', '10^5', '2'),
  output='Print "Lucky" or "Unlucky".',
  notes='In the first example the minimum $5$ occurs once, so the array is lucky. In the second, the minimum $3$ occurs '
        'four times.',
  samples=[('5\n8 8 9 5 9', 'Lucky'), ('5\n3 3 3 5 3', 'Unlucky')],
  solution=CPP + 'int main(){ int n; cin>>n; vector<int> a(n); for(auto&x:a) cin>>x; int m=*min_element(a.begin(),a.end()); '
                 'cout<<(count(a.begin(),a.end(),m)%2?"Lucky":"Unlucky")<<"\\n"; }\n',
  gen=lambda r: ['2\n1 1', '2\n1 2', '3\n-100000 -100000 -100000', '4\n100000 100000 100000 100000',
                 '1000\n' + ' '.join(['7'] * 1000), '999\n' + ' '.join(['7'] * 999), arr(r, 1000, -3, 3), arr(r, 1000, 0, 2),
                 arr(r, 1000, -100000, 100000)]
                + [arr(r, ri(r, 2, 1000), -2, 5) for _ in range(4)])

# ---------------------------------------------------------------- K
P(letter='K', name='s3-sum-digits', title='Sum Digits', tl=2000, ml=256, checker=WCMP,
  legend='You are given $N$ digits written together with no spaces. Print their sum.',
  input='The first line contains $N$ ($1 \\le N \\le 10^6$). The second line contains $N$ digits with no separators.',
  output='Print the sum of the digits.',
  notes='$1 + 3 + 3 + 0 + 5 = 12$.',
  samples=[('5\n13305', '12')],
  solution=CPP + 'int main(){ int n; string s; cin>>n>>s; long long t=0; for(char c:s) t+=c-\'0\'; cout<<t<<"\\n"; }\n',
  gen=lambda r: ['1\n0', '1\n9', '6\n000000', '1000000\n' + '9' * 1000000,
                 '1000000\n' + ''.join(str(ri(r, 0, 9)) for _ in range(1000000)),
                 '20\n' + ''.join(str(ri(r, 0, 9)) for _ in range(20)), '12\n100000000001'])

# ---------------------------------------------------------------- L
P(letter='L', name='s3-max-subarray', title='Max Subarray', tl=1000, ml=256, checker=ANY_ORDER,
  legend='A subarray is a contiguous block $A_i, A_{i+1}, \\ldots, A_j$ ($1 \\le i \\le j \\le N$) of an array. For '
         'example, the subarrays of $[1, 6, 3, 7]$ are $[1]$, $[6]$, $[3]$, $[7]$, $[1, 6]$, $[6, 3]$, $[3, 7]$, '
         '$[1, 6, 3]$, $[6, 3, 7]$ and $[1, 6, 3, 7]$; $[1, 3]$ is not one.\n\nYou are given an array $A$ of $N$ '
         'integers. Print the maximum of every subarray.',
  input='The first line contains $T$ ($1 \\le T \\le 5$), the number of test cases. Each test case has two lines: '
        '$N$ ($1 \\le N \\le 100$), then $N$ integers $A_i$ ($-10^5 \\le A_i \\le 10^5$).',
  output='For each test case print one line with the maxima of all $N(N+1)/2$ subarrays, separated by spaces, in any order.',
  samples=[('2\n4\n1 6 3 7\n3\n3 1 2', '1 6 3 7 6 6 7 6 7 7\n3 3 3 1 2 2')],
  solution=CPP + 'int main(){ int t; cin>>t; while(t--){ int n; cin>>n; vector<int> a(n); for(auto&x:a) cin>>x; '
                 'for(int l=1;l<=n;l++) for(int i=0;i+l<=n;i++) cout<<*max_element(a.begin()+i,a.begin()+i+l)<<" "; cout<<"\\n"; } }\n',
  wrong={'wrong-singles.cpp': CPP + 'int main(){ int t; cin>>t; while(t--){ int n; cin>>n; vector<int> a(n); for(auto&x:a) cin>>x; '
                                    'for(int x:a) cout<<x<<" "; cout<<"\\n"; } }\n'},
  gen=lambda r: [multi(['1\n-100000']), multi(['2\n5 5', '2\n-1 -2']), multi([arr(r, 100, -10**5, 10**5) for _ in range(5)]),
                 multi(['100\n' + ' '.join(map(str, range(1, 101))), '100\n' + ' '.join(map(str, range(100, 0, -1)))]),
                 multi([arr(r, ri(r, 1, 100), -3, 3) for _ in range(5)])])

# ---------------------------------------------------------------- M
def gen_minmax(r):
    t = ['2\n1 2', '2\n100000 -100000', '3\n1 2 3', '3\n3 2 1']
    for n in (1000, 1000, 2, 500):
        t.append(f'{n}\n{" ".join(map(str, r.sample(range(-100000, 100001), n)))}')
    return t


P(letter='M', name='s3-replace-minmax', title='Replace MinMax', tl=1000, ml=256, checker=WCMP,
  legend='You are given an array $A$ of $N$ distinct integers. Swap its minimum with its maximum, then print the array.',
  input=ARR_IN('1000', '-10^5', '10^5', '2') + ' All values are distinct.',
  output='Print the array after the swap, separated by spaces.',
  samples=[('5\n4 1 3 10 8', '4 10 3 1 8')],
  solution=CPP + 'int main(){ int n; cin>>n; vector<int> a(n); for(auto&x:a) cin>>x; iter_swap(min_element(a.begin(),a.end()),'
                 'max_element(a.begin(),a.end())); for(int x:a) cout<<x<<" "; cout<<"\\n"; }\n',
  gen=gen_minmax)


# ---------------------------------------------------------------- N
def gen_code(r):
    def code(a, b, ok):
        s = [str(ri(r, 0, 9)) for _ in range(a + b + 1)]
        s[a] = '-'
        if not ok:
            k = r.choice(['move', 'extra'])
            if k == 'move':
                j = r.choice([i for i in range(a + b + 1) if i != a])
                s[a], s[j] = s[j], '-'
            else:
                s[r.choice([i for i in range(a + b + 1) if i != a])] = '-'
        return f'{a} {b}\n{"".join(s)}'
    t = ['1 1\n1-1', '1 1\n--1', '1 1\n1--', '1 1\n-11', '10 10\n' + '9' * 10 + '-' + '0' * 10, '10 10\n' + '9' * 21,
         '10 1\n0123456789-5', '1 10\n5-0123456789', '2 3\n12-34-', '3 2\n---12']
    t += [code(ri(r, 1, 10), ri(r, 1, 10), r.random() < 0.5) for _ in range(8)]
    return t


P(letter='N', name='s3-check-code', title='Check Code', tl=1000, ml=256, checker=WCMP,
  legend='You are given $A$, $B$ and a code $S$ of length $A + B + 1$ made of digits and the symbol \\texttt{-}. '
         'The code is valid if its $(A+1)$-th character is \\texttt{-} and every other character is a digit. '
         'Decide whether $S$ is valid.',
  input='The first line contains $A$ and $B$ ($1 \\le A, B \\le 10$). The second line contains $S$ '
        '($|S| = A + B + 1$), made of \\texttt{-} and the digits \\texttt{0} to \\texttt{9}.',
  output='Print "Yes" if the code is valid, otherwise "No".',
  samples=[('3 3\n269-665', 'Yes'), ('1 1\n12-', 'No'), ('1 2\n7444', 'No')],
  solution=CPP + 'int main(){ int a,b; string s; cin>>a>>b>>s; bool ok=true; for(int i=0;i<(int)s.size();i++) '
                 'if(i==a ? s[i]!=\'-\' : !isdigit(s[i])) ok=false; cout<<(ok?"Yes":"No")<<"\\n"; }\n',
  wrong={'wrong-dash-only.cpp': CPP + 'int main(){ int a,b; string s; cin>>a>>b>>s; cout<<(s[a]==\'-\'?"Yes":"No")<<"\\n"; }\n'},
  gen=gen_code)

# ---------------------------------------------------------------- O
P(letter='O', name='s3-fibonacci', title='Fibonacci', tl=1000, ml=256, checker=WCMP,
  legend='You are given $N$. Print $fib(N)$, where $fib(1) = 0$, $fib(2) = 1$ and $fib(n) = fib(n-1) + fib(n-2)$.',
  input='One line with an integer $N$ ($1 \\le N \\le 50$).',
  output='Print $fib(N)$.',
  notes='$fib(50)$ does not fit in a 32-bit \\texttt{int}.',
  samples=[('1', '0'), ('5', '3')],
  solution=CPP + 'int main(){ int n; cin>>n; long long a=0,b=1; for(int i=1;i<n;i++){ long long c=a+b; a=b; b=c; } cout<<a<<"\\n"; }\n',
  wrong={'wrong-int.cpp': CPP + 'int main(){ int n; cin>>n; int a=0,b=1; for(int i=1;i<n;i++){ int c=a+b; a=b; b=c; } cout<<a<<"\\n"; }\n'},
  gen=lambda r: ['2', '3', '50', '49', '48', '47', '46', '30'])


# ---------------------------------------------------------------- P
def gen_minimize(r):
    t = ['1\n1', '1\n536870912', '1\n1000000000', '2\n536870912 536870912', '200\n' + ' '.join(['536870912'] * 200),
         '3\n2 4 7', '3\n1024 2048 3']
    for _ in range(4):
        k = ri(r, 0, 20)
        n = ri(r, 1, 200)
        t.append(f'{n}\n{" ".join(str((2 * ri(r, 0, (10**9 >> k) // 2 - 1) + 1) << k) if (10**9 >> k) > 2 else str(1 << k) for _ in range(n))}')
    return t


P(letter='P', name='s3-minimize-number', title='Minimize Number', tl=1000, ml=256, checker=WCMP,
  legend='You are given $N$ positive integers. While all of them are even, you may divide every one of them by $2$. '
         'Print the maximum number of times you can do this.',
  input=ARR_IN('200', '1', '10^9'),
  output='Print the maximum number of operations.',
  notes='$[8, 12, 40] \\to [4, 6, 20] \\to [2, 3, 10]$: now $3$ is odd, so the answer is $2$.',
  samples=[('3\n8 12 40', '2'), ('4\n5 6 8 10', '0')],
  solution=CPP + 'int main(){ int n; cin>>n; int b=100; while(n--){ long long x; cin>>x; int c=0; while(x%2==0){ x/=2; c++; } b=min(b,c); } '
                 'cout<<b<<"\\n"; }\n',
  gen=gen_minimize)


# ---------------------------------------------------------------- Q
P(letter='Q', name='s3-count-subarrays', title='Count Subarrays', tl=1000, ml=256, checker=WCMP,
  legend='A subarray is a contiguous block $A_i, A_{i+1}, \\ldots, A_j$ ($1 \\le i \\le j \\le N$) of an array. It is '
         'non-decreasing if $A_i \\le A_{i+1} \\le \\ldots \\le A_j$; a single element always is.\n\nYou are given an '
         'array $A$ of $N$ integers. Count its non-decreasing subarrays.',
  input='The first line contains $T$ ($1 \\le T \\le 5$), the number of test cases. Each test case has two lines: '
        '$N$ ($1 \\le N \\le 100$), then $N$ integers $A_i$ ($-10^5 \\le A_i \\le 10^5$).',
  output='For each test case print the count on its own line.',
  notes='In the first test case the non-decreasing subarrays are $[1]$, $[1, 4]$, $[4]$, $[2]$, $[3]$, $[5]$, $[2, 3]$, '
        '$[3, 5]$ and $[2, 3, 5]$.',
  samples=[('2\n5\n1 4 2 3 5\n1\n5', '9\n1')],
  solution=CPP + 'int main(){ int t; cin>>t; while(t--){ int n; cin>>n; vector<int> a(n); for(auto&x:a) cin>>x; long long c=0,run=0; '
                 'for(int i=0;i<n;i++){ run=(i&&a[i-1]<=a[i])?run+1:1; c+=run; } cout<<c<<"\\n"; } }\n',
  wrong={'wrong-strict.cpp': CPP + 'int main(){ int t; cin>>t; while(t--){ int n; cin>>n; vector<int> a(n); for(auto&x:a) cin>>x; '
                                   'long long c=0,run=0; for(int i=0;i<n;i++){ run=(i&&a[i-1]<a[i])?run+1:1; c+=run; } cout<<c<<"\\n"; } }\n'},
  gen=lambda r: [multi(['1\n7']), multi(['100\n' + ' '.join(['5'] * 100)]), multi(['100\n' + ' '.join(map(str, range(100, 0, -1)))]),
                 multi(['100\n' + ' '.join(map(str, range(100)))] * 5), multi([arr(r, 100, -2, 2) for _ in range(5)]),
                 multi([arr(r, ri(r, 1, 100), -10**5, 10**5) for _ in range(5)])])


# ---------------------------------------------------------------- R
def gen_perm(r):
    t = ['1\n1\n1', '1\n1\n2', '3\n1 1 2\n1 2 2', '3\n1 2 2\n2 1 2', '2\n3 5\n4 4', '4\n1 1 1 1\n1 1 1 1']
    for _ in range(3):
        a = [ri(r, 1, 10**7) for _ in range(1000)]
        b = a[:]
        r.shuffle(b)
        t.append(f'1000\n{" ".join(map(str, a))}\n{" ".join(map(str, b))}')
        b[ri(r, 0, 999)] += 1
        t.append(f'1000\n{" ".join(map(str, a))}\n{" ".join(map(str, b))}')
    a = [ri(r, 1, 3) for _ in range(1000)]
    b = a[:]
    r.shuffle(b)
    i = b.index(2)
    b[i] = 1
    b[b.index(3)] = 2   # same sum as before only if counts shift: sum differs by -2, keep one more swap below
    b[b.index(1)] = 3   # restores the sum, but the multiset differs
    t.append(f'1000\n{" ".join(map(str, a))}\n{" ".join(map(str, b))}')
    return t


P(letter='R', name='s3-permutation-with-arrays', title='Permutation with Arrays', tl=1000, ml=256, checker=WCMP,
  legend='You are given two arrays $A$ and $B$ of $N$ integers each. Decide whether $B$ is a permutation of $A$, '
         'that is, the same values with the same counts, possibly in a different order. For example $[2, 1, 3]$, '
         '$[3, 2, 1]$ and $[2, 3, 1]$ are permutations of $[1, 2, 3]$.',
  input='The first line contains $N$ ($1 \\le N \\le 10^3$). The second line contains $A_1, \\ldots, A_N$ and the third '
        'line $B_1, \\ldots, B_N$ ($1 \\le A_i, B_i \\le 10^7$).',
  output='Print "yes" if $B$ is a permutation of $A$, otherwise "no".',
  samples=[('4\n4 2 3 7\n2 3 4 9', 'no'), ('5\n5 1 1 9 3\n1 9 1 5 3', 'yes')],
  solution=CPP + 'int main(){ int n; cin>>n; vector<int> a(n),b(n); for(auto&x:a) cin>>x; for(auto&x:b) cin>>x; '
                 'sort(a.begin(),a.end()); sort(b.begin(),b.end()); cout<<(a==b?"yes":"no")<<"\\n"; }\n',
  wrong={'wrong-sum.cpp': CPP + 'int main(){ int n; cin>>n; long long s=0; for(int i=0;i<n;i++){ long long x; cin>>x; s+=x; } '
                                'for(int i=0;i<n;i++){ long long x; cin>>x; s-=x; } cout<<(s==0?"yes":"no")<<"\\n"; }\n',
         'wrong-contains.cpp': CPP + 'int main(){ int n; cin>>n; vector<int> a(n),b(n); for(auto&x:a) cin>>x; for(auto&x:b) cin>>x; '
                                     'bool ok=true; for(int x:b) if(find(a.begin(),a.end(),x)==a.end()) ok=false; cout<<(ok?"yes":"no")<<"\\n"; }\n'},
  gen=gen_perm)


# ---------------------------------------------------------------- S
def gen_matrix_search(r):
    def mat(n, m, lo, hi):
        return [[ri(r, lo, hi) for _ in range(m)] for _ in range(n)]

    def fmt(a, x):
        return f'{len(a)} {len(a[0])}\n' + '\n'.join(' '.join(map(str, row)) for row in a) + f'\n{x}'
    t = ['2 2\n1 1\n1 1\n0', '2 2\n1 1\n1 1\n1', '2 2\n100000 1\n1 1\n100000']
    a = mat(100, 100, 1, 100000)
    t += [fmt(a, a[99][99]), fmt(a, a[0][0]), fmt(a, a[50][37])]
    seen = {v for row in a for v in row}
    t.append(fmt(a, next(v for v in range(1, 100001) if v not in seen)))
    t.append(fmt(mat(2, 100, 1, 5), 6))
    t.append(fmt(mat(100, 2, 1, 5), 3))
    return t


P(letter='S', name='s3-search-in-matrix', title='Search In Matrix', tl=2000, ml=64, checker=WCMP,
  legend='You are given an $N \\times M$ matrix $A$ and a number $X$. If $X$ appears in the matrix print '
         '"will not take number", otherwise print "will take number".',
  input='The first line contains $N$ and $M$ ($2 \\le N, M \\le 100$), the numbers of rows and columns. Each of the next '
        '$N$ lines contains $M$ integers ($1 \\le A_{i,j} \\le 10^5$). The last line contains $X$ ($0 \\le X \\le 10^5$).',
  output='Print "will not take number" if $X$ is in the matrix, otherwise "will take number".',
  samples=[('2 2\n1 2\n3 4\n3', 'will not take number'), ('2 2\n1 2\n3 4\n10', 'will take number')],
  solution=CPP + 'int main(){ int n,m; cin>>n>>m; vector<int> a(n*m); for(auto&x:a) cin>>x; int x; cin>>x; '
                 'cout<<(find(a.begin(),a.end(),x)!=a.end()?"will not take number":"will take number")<<"\\n"; }\n',
  gen=gen_matrix_search)


# ---------------------------------------------------------------- T
def gen_diag(r):
    def fmt(a):
        return f'{len(a)}\n' + '\n'.join(' '.join(map(str, row)) for row in a)
    t = ['1\n-100', '1\n100', '2\n100 -100\n-100 100', '3\n1 2 3\n4 5 6\n7 8 9']
    t.append(fmt([[100 if i == j else -100 if i + j == 99 else 0 for j in range(100)] for i in range(100)]))
    t.append(fmt([[ri(r, -100, 100) for _ in range(100)] for _ in range(100)]))
    t.append(fmt([[ri(r, -100, 100) for _ in range(99)] for _ in range(99)]))
    return t


P(letter='T', name='s3-matrix', title='Matrix', tl=1000, ml=256, checker=WCMP,
  legend='You are given an $N \\times N$ matrix. Print the absolute difference between the sum of its main diagonal '
         '(top-left to bottom-right) and the sum of its other diagonal (top-right to bottom-left).',
  input='The first line contains $N$ ($1 \\le N \\le 100$). Each of the next $N$ lines contains $N$ integers '
        '($-100 \\le A_{i,j} \\le 100$).',
  output='Print the absolute difference.',
  notes='In the example the main diagonal is $1 - 4 + 5 - 6 = -4$ and the other is $1 + 6 + 8 + 3 = 18$; '
        '$|-4 - 18| = 22$.',
  samples=[('4\n1 5 12 1\n2 -4 6 7\n3 8 5 9\n3 5 23 -6', '22')],
  solution=CPP + 'int main(){ int n; cin>>n; long long d=0; for(int i=0;i<n;i++) for(int j=0;j<n;j++){ int x; cin>>x; '
                 'if(i==j) d+=x; if(i+j==n-1) d-=x; } cout<<llabs(d)<<"\\n"; }\n',
  gen=gen_diag)


# ---------------------------------------------------------------- U
def gen_subseq(r):
    def fmt(a, b):
        return f'{len(a)} {len(b)}\n{" ".join(map(str, a))}\n{" ".join(map(str, b))}'
    t = ['1 1\n5\n5', '1 1\n5\n6', '3 2\n1 2 3\n3 1', '3 2\n1 2 1\n1 1', '3 2\n1 2 3\n2 2', '4 4\n1 2 3 4\n1 2 4 3']
    a = [ri(r, 1, 10**9) for _ in range(10000)]
    idx = sorted(r.sample(range(10000), 5000))
    t.append(fmt(a, [a[i] for i in idx]))
    b = [a[i] for i in idx]
    b[-1], b[-2] = b[-2], b[-1]
    if b[-1] != b[-2]:
        t.append(fmt(a, b))
    t.append(fmt(a, a))
    small = [ri(r, 1, 3) for _ in range(10000)]
    t.append(fmt(small, [ri(r, 1, 3) for _ in range(3000)]))
    t.append(fmt(small, [small[i] for i in sorted(r.sample(range(10000), 9000))]))
    return t


P(letter='U', name='s3-is-b-a-subsequence-of-a', title='Is B a subsequence of A?', tl=1000, ml=256, checker=WCMP,
  legend='A subsequence is what remains of a sequence after deleting some (or no) elements without changing the order '
         'of the rest. For example, $[1, 3, 7]$, $[6, 7]$ and $[1]$ are subsequences of $[1, 6, 3, 7]$, but $[3, 1]$ '
         'is not.\n\nYou are given arrays $A$ of $N$ integers and $B$ of $M$ integers. Decide whether $B$ is a '
         'subsequence of $A$.',
  input='The first line contains $N$ and $M$ ($1 \\le N \\le 10^4$, $1 \\le M \\le N$). The second line contains the $N$ '
        'elements of $A$ and the third line the $M$ elements of $B$ ($1 \\le A_i, B_i \\le 10^9$).',
  output='Print "YES" if $B$ is a subsequence of $A$, otherwise "NO".',
  samples=[('3 2\n1 4 7\n1 7', 'YES'), ('7 4\n1 8 4 7 5 2 7\n4 5 7 2', 'NO'), ('3 3\n21 8 40\n21 8 40', 'YES')],
  solution=CPP + 'int main(){ int n,m; cin>>n>>m; vector<long long> a(n),b(m); for(auto&x:a) cin>>x; for(auto&x:b) cin>>x; '
                 'int j=0; for(int i=0;i<n&&j<m;i++) if(a[i]==b[j]) j++; cout<<(j==m?"YES":"NO")<<"\\n"; }\n',
  wrong={'wrong-membership.cpp': CPP + 'int main(){ int n,m; cin>>n>>m; vector<long long> a(n),b(m); for(auto&x:a) cin>>x; '
                                       'for(auto&x:b) cin>>x; bool ok=true; for(auto x:b) if(find(a.begin(),a.end(),x)==a.end()) ok=false; '
                                       'cout<<(ok?"YES":"NO")<<"\\n"; }\n'},
  gen=gen_subseq)

# ---------------------------------------------------------------- V
P(letter='V', name='s3-frequency-array', title='Frequency Array', tl=1000, ml=256, checker=WCMP,
  legend='You are given $N$, $M$ and an array $A$ of $N$ integers between $1$ and $M$. For every number from $1$ to $M$, '
         'print how many times it appears in $A$.',
  input='The first line contains $N$ and $M$ ($1 \\le N, M \\le 10^5$). The second line contains $N$ integers $A_i$ '
        '($1 \\le A_i \\le M$).',
  output='Print $M$ lines; line $i$ is the number of times $i$ appears in $A$.',
  samples=[('10 5\n1 2 3 4 5 3 2 1 5 3', '2\n2\n3\n1\n2')],
  solution=CPP + 'int main(){ int n,m; cin>>n>>m; vector<int> f(m+1); while(n--){ int x; cin>>x; f[x]++; } '
                 'for(int i=1;i<=m;i++) cout<<f[i]<<"\\n"; }\n',
  wrong={'wrong-quadratic.cpp': CPP + 'int main(){ int n,m; cin>>n>>m; vector<int> a(n); for(auto&x:a) cin>>x; '
                                      'for(int i=1;i<=m;i++){ int c=0; for(int x:a) c+=x==i; cout<<c<<"\\n"; } }\n'},
  gen=lambda r: ['1 1\n1', '1 100000\n100000', '100000 1\n' + ' '.join(['1'] * 100000),
                 '100000 100000\n' + nums(r, 100000, 1, 100000), '100000 100000\n' + ' '.join(map(str, range(1, 100001))),
                 '100000 10\n' + nums(r, 100000, 1, 10), '5 100000\n' + nums(r, 5, 1, 100000)])


# ---------------------------------------------------------------- W
def gen_mirror(r):
    def fmt(a):
        return f'{len(a)} {len(a[0])}\n' + '\n'.join(' '.join(map(str, row)) for row in a)
    return ['1 1\n7', '1 5\n1 2 3 4 5', '5 1\n1\n2\n3\n4\n5', '2 2\n1000000000 1\n1 1000000000',
            fmt([[ri(r, 1, 10**9) for _ in range(100)] for _ in range(100)]),
            fmt([[ri(r, 1, 9) for _ in range(37)] for _ in range(63)])]


P(letter='W', name='s3-mirror-array', title='Mirror Array', tl=1000, ml=256, checker=WCMP,
  legend='You are given an $N \\times M$ matrix. Print it as it would look in a mirror placed to its right: every row '
         'reversed.',
  input='The first line contains $N$ and $M$ ($1 \\le N, M \\le 100$), the numbers of rows and columns. Each of the next '
        '$N$ lines contains $M$ integers ($1 \\le A_{i,j} \\le 10^9$).',
  output='Print the mirrored matrix: $N$ lines of $M$ numbers separated by spaces.',
  samples=[('3 3\n2 3 5\n7 9 20\n35 1 12', '5 3 2\n20 9 7\n12 1 35')],
  solution=CPP + 'int main(){ int n,m; cin>>n>>m; for(int i=0;i<n;i++){ vector<long long> r(m); for(auto&x:r) cin>>x; '
                 'for(int j=m-1;j>=0;j--) cout<<r[j]<<" "; cout<<"\\n"; } }\n',
  gen=gen_mirror)


# ---------------------------------------------------------------- X
def gen_neighbors(r):
    def fmt(g, x, y):
        return f'{len(g)} {len(g[0])}\n' + '\n'.join(g) + f'\n{x} {y}'
    full = lambda n, m: ['x' * m for _ in range(n)]
    t = [fmt(full(2, 2), 1, 1), fmt(full(2, 2), 2, 2), fmt(['x.', 'xx'], 2, 1), fmt(['.x', 'xx'], 1, 2),
         fmt(full(100, 100), 100, 100), fmt(full(100, 100), 1, 100), fmt(full(100, 100), 50, 50)]
    g = [list('x' * 100) for _ in range(100)]
    g[49][49] = '.'   # only the centre cell itself is '.', which does not matter
    t.append(fmt([''.join(row) for row in g], 50, 50))
    for dx, dy in ((-1, -1), (-1, 1), (1, -1), (1, 1), (0, 1), (1, 0)):
        g = [list('x' * 100) for _ in range(100)]
        g[49 + dx][49 + dy] = '.'
        t.append(fmt([''.join(row) for row in g], 50, 50))
    g = [list('x' * 100) for _ in range(100)]
    g[0][1] = '.'   # far from the asked cell's corner neighbour? no: (1,1)'s neighbour (1,2) -> 'no'
    t.append(fmt([''.join(row) for row in g], 1, 1))
    g = [list('x' * 100) for _ in range(100)]
    g[99][97] = '.'   # outside the 3x3 block of (100,100)
    t.append(fmt([''.join(row) for row in g], 100, 100))
    for _ in range(3):
        n, m = ri(r, 2, 100), ri(r, 2, 100)
        t.append(fmt([''.join(r.choice('xxxxxxx.') for _ in range(m)) for _ in range(n)], ri(r, 1, n), ri(r, 1, m)))
    return t


P(letter='X', name='s3-8-neighbors', title='8 Neighbors', tl=1000, ml=256, checker=WCMP,
  legend='You are given an $N \\times M$ grid of \\texttt{x} and \\texttt{.} characters and a cell $(X, Y)$ (row $X$, '
         'column $Y$). The neighbours of a cell are the cells inside the grid that share a side or a corner with it. '
         'Decide whether all neighbours of $(X, Y)$ are \\texttt{x}.',
  input='The first line contains $N$ and $M$ ($2 \\le N, M \\le 100$). Each of the next $N$ lines contains $M$ characters, '
        'each \\texttt{x} or \\texttt{.}. The last line contains $X$ and $Y$ ($1 \\le X \\le N$, $1 \\le Y \\le M$).',
  output='Print "yes" if all neighbours are \\texttt{x}, otherwise "no".',
  notes='The cell $(X, Y)$ itself does not count.',
  samples=[('3 3\nxxx\nx.x\nxxx\n2 2', 'yes'), ('3 3\nxxx\nxxx\nxx.\n2 2', 'no'), ('3 3\nxxx\nxxx\nxxx\n1 1', 'yes')],
  solution=CPP + 'int main(){ int n,m; cin>>n>>m; vector<string> g(n); for(auto&s:g) cin>>s; int x,y; cin>>x>>y; x--; y--; bool ok=true; '
                 'for(int dx=-1;dx<=1;dx++) for(int dy=-1;dy<=1;dy++){ if(!dx&&!dy) continue; int i=x+dx,j=y+dy; '
                 'if(i>=0&&i<n&&j>=0&&j<m&&g[i][j]!=\'x\') ok=false; } cout<<(ok?"yes":"no")<<"\\n"; }\n',
  wrong={'wrong-four.cpp': CPP + 'int main(){ int n,m; cin>>n>>m; vector<string> g(n); for(auto&s:g) cin>>s; int x,y; cin>>x>>y; x--; y--; '
                                 'bool ok=true; int d[4][2]={{0,1},{1,0},{0,-1},{-1,0}}; for(auto&e:d){ int i=x+e[0],j=y+e[1]; '
                                 'if(i>=0&&i<n&&j>=0&&j<m&&g[i][j]!=\'x\') ok=false; } cout<<(ok?"yes":"no")<<"\\n"; }\n'},
  gen=gen_neighbors)


# ---------------------------------------------------------------- Y
def gen_rsq(r):
    t = ['1 1\n1000000000\n1 1']
    n = 100000
    a = nums(r, n, 1, 10**9)
    t.append(f'{n} {n}\n{" ".join(["1000000000"] * n)}\n' + '\n'.join(['1 100000'] * n))
    t.append(f'{n} {n}\n{a}\n' + '\n'.join(f'{l} {ri(r, l, n)}' for l in (ri(r, 1, 100) for _ in range(n))))
    qs = []
    for _ in range(n):
        l = ri(r, 1, n)
        qs.append(f'{l} {ri(r, l, n)}')
    t.append(f'{n} {n}\n{a}\n' + '\n'.join(qs))
    t.append(f'{n} {n}\n{a}\n' + '\n'.join(f'{i} {i}' for i in range(1, n + 1)))
    t.append(f'10 5\n{nums(r, 10, 1, 10)}\n1 10\n10 10\n1 1\n3 7\n2 9')
    return t


P(letter='Y', name='s3-range-sum-query', title='Range Sum Query', tl=1500, ml=256, checker=WCMP,
  legend='You are given an array $A$ of $N$ integers and $Q$ queries. Each query gives $L$ and $R$; print '
         '$A_L + A_{L+1} + \\ldots + A_R$.',
  input='The first line contains $N$ and $Q$ ($1 \\le N, Q \\le 10^5$). The second line contains $N$ integers $A_i$ '
        '($1 \\le A_i \\le 10^9$). Each of the next $Q$ lines contains $L$ and $R$ ($1 \\le L \\le R \\le N$).',
  output='For each query print the sum on its own line.',
  notes='Adding the numbers one by one for every query is too slow for the largest tests.',
  samples=[('6 3\n6 4 2 7 2 7\n1 3\n3 6\n1 6', '12\n18\n28'), ('4 3\n5 5 2 3\n1 3\n2 3\n1 4', '12\n7\n15')],
  solution=CPP + 'int main(){ ios::sync_with_stdio(false); cin.tie(nullptr); int n,q; cin>>n>>q; vector<long long> p(n+1); '
                 'for(int i=1;i<=n;i++){ cin>>p[i]; p[i]+=p[i-1]; } while(q--){ int l,r; cin>>l>>r; cout<<p[r]-p[l-1]<<"\\n"; } }\n',
  wrong={'wrong-naive.cpp': CPP + 'int main(){ ios::sync_with_stdio(false); cin.tie(nullptr); int n,q; cin>>n>>q; vector<long long> a(n+1); '
                                  'for(int i=1;i<=n;i++) cin>>a[i]; while(q--){ int l,r; cin>>l>>r; long long s=0; for(int i=l;i<=r;i++) s+=a[i]; '
                                  'cout<<s<<"\\n"; } }\n',
         'wrong-int.cpp': CPP + 'int main(){ ios::sync_with_stdio(false); cin.tie(nullptr); int n,q; cin>>n>>q; vector<int> p(n+1); '
                                'for(int i=1;i<=n;i++){ cin>>p[i]; p[i]+=p[i-1]; } while(q--){ int l,r; cin>>l>>r; cout<<p[r]-p[l-1]<<"\\n"; } }\n'},
  gen=gen_rsq)


# ---------------------------------------------------------------- Z
def gen_bs(r):
    n = 100000
    a = [ri(r, 1, 10**9) for _ in range(n)]
    s = set(a)
    present = lambda: str(r.choice(a))
    absent = lambda: str(next(x for x in iter(lambda: ri(r, 1, 10**9), None) if x not in s))
    t = ['1 1\n1\n1', '1 1\n1\n1000000000', '3 3\n5 5 5\n5\n4\n6']
    t.append(f'{n} {n}\n{" ".join(map(str, a))}\n' + '\n'.join(absent() for _ in range(n)))
    t.append(f'{n} {n}\n{" ".join(map(str, a))}\n' + '\n'.join(present() if r.random() < 0.5 else absent() for _ in range(n)))
    t.append(f'{n} {n}\n{" ".join(map(str, range(2, 2 * n + 1, 2)))}\n' + '\n'.join(str(ri(r, 1, 2 * n + 1)) for _ in range(n)))
    return t


P(letter='Z', name='s3-binary-search', title='Binary Search', tl=1000, ml=256, checker=WCMP,
  legend='You are given an array $A$ of $N$ integers and $Q$ queries, each a number $X$. For each query print "found" '
         'if $X$ is in $A$, otherwise "not found".',
  input='The first line contains $N$ and $Q$ ($1 \\le N, Q \\le 10^5$). The second line contains $N$ integers $A_i$ '
        '($1 \\le A_i \\le 10^9$). Each of the next $Q$ lines contains $X$ ($1 \\le X \\le 10^9$).',
  output='For each query print "found" or "not found" on its own line.',
  notes='Checking the whole array for every query is too slow for the largest tests.',
  samples=[('5 3\n1 5 4 3 2\n5\n3\n6', 'found\nfound\nnot found')],
  solution=CPP + 'int main(){ ios::sync_with_stdio(false); cin.tie(nullptr); int n,q; cin>>n>>q; vector<int> a(n); for(auto&x:a) cin>>x; '
                 'sort(a.begin(),a.end()); while(q--){ int x; cin>>x; cout<<(binary_search(a.begin(),a.end(),x)?"found":"not found")<<"\\n"; } }\n',
  wrong={'wrong-linear.cpp': CPP + 'int main(){ ios::sync_with_stdio(false); cin.tie(nullptr); int n,q; cin>>n>>q; vector<int> a(n); '
                                   'for(auto&x:a) cin>>x; while(q--){ int x; cin>>x; bool f=false; for(int y:a) if(y==x){ f=true; break; } '
                                   'cout<<(f?"found":"not found")<<"\\n"; } }\n'},
  gen=gen_bs)
