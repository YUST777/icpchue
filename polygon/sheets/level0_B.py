"""ICPC HUE Level 0, Sheet 2 (Loops), problems A-Z.

Same tasks, formats and samples as the training sheet; statements in our own
words.

    python3 polygon/build.py polygon/sheets/level0_B.py polygon/level0-sheet2
"""

CPP = '#include <bits/stdc++.h>\nusing namespace std;\n'
WCMP = 'std::wcmp.cpp'
LINES = {'custom': 'lines'}   # pattern output: leading spaces matter


def ri(rng, lo, hi):
    return rng.randint(lo, hi)


def nums(rng, n, lo, hi):
    return ' '.join(str(rng.randint(lo, hi)) for _ in range(n))


def multi(cases):
    return f'{len(cases)}\n' + '\n'.join(cases)


PROBLEMS = []


def P(**kw):
    PROBLEMS.append(kw)


SHAPE_INPUT = 'One line with an integer $N$ ($1 \\le N \\le 99$).'
SHAPE_NOTE = 'Do not print spaces after the last \\texttt{*} of a line.'

# ---------------------------------------------------------------- A
P(letter='A', name='s2-one-to-n', title='1 to N', tl=1000, ml=256, checker=WCMP,
  legend='You are given an integer $N$. Print all integers from $1$ to $N$, each on its own line.',
  input='One line with an integer $N$ ($1 \\le N \\le 10^3$).',
  output='Print $N$ lines: $1, 2, \\ldots, N$.',
  samples=[('5', '1\n2\n3\n4\n5')],
  solution=CPP + 'int main(){ int n; cin>>n; for(int i=1;i<=n;i++) cout<<i<<"\\n"; }\n',
  wrong={'wrong-from-zero.cpp': CPP + 'int main(){ int n; cin>>n; for(int i=0;i<n;i++) cout<<i<<"\\n"; }\n'},
  gen=lambda r: ['1', '2', '1000', '999'] + [str(ri(r, 1, 1000)) for _ in range(6)])

# ---------------------------------------------------------------- B
P(letter='B', name='s2-even-numbers', title='Even Numbers', tl=1000, ml=256, checker=WCMP,
  legend='You are given an integer $N$. Print every even number between $1$ and $N$ (inclusive), each on its own line.',
  input='One line with an integer $N$ ($1 \\le N \\le 10^3$).',
  output='Print the even numbers in increasing order, one per line. If there is none, print $-1$.',
  samples=[('10', '2\n4\n6\n8\n10'), ('5', '2\n4')],
  solution=CPP + 'int main(){ int n; cin>>n; if(n<2){ cout<<-1<<"\\n"; return 0; } for(int i=2;i<=n;i+=2) cout<<i<<"\\n"; }\n',
  wrong={'wrong-no-minus-one.cpp': CPP + 'int main(){ int n; cin>>n; for(int i=2;i<=n;i+=2) cout<<i<<"\\n"; }\n'},
  gen=lambda r: ['1', '2', '3', '999', '1000'] + [str(ri(r, 1, 1000)) for _ in range(5)])

# ---------------------------------------------------------------- C
P(letter='C', name='s2-even-odd-positive-negative', title='Even, Odd, Positive and Negative', tl=1000, ml=256,
  checker=WCMP,
  legend='You are given $N$ integers. Count how many of them are even, how many are odd, how many are positive '
         'and how many are negative.',
  input='The first line contains $N$ ($1 \\le N \\le 10^3$). The second line contains $N$ integers $X_i$ '
        '($-10^5 \\le X_i \\le 10^5$).',
  output='Print four lines:\n\\begin{itemize}\n\\item "Even: $E$"\n\\item "Odd: $O$"\n\\item "Positive: $P$"\n'
         '\\item "Negative: $Q$"\n\\end{itemize}\nwhere $E$, $O$, $P$, $Q$ are the four counts.',
  notes='Zero is even, but it is neither positive nor negative.',
  samples=[('5\n-5 0 -3 -4 12', 'Even: 3\nOdd: 2\nPositive: 1\nNegative: 3')],
  solution=CPP + 'int main(){ int n; cin>>n; int e=0,o=0,p=0,q=0; while(n--){ int x; cin>>x; if(x%2==0) e++; else o++; '
                 'if(x>0) p++; if(x<0) q++; } cout<<"Even: "<<e<<"\\nOdd: "<<o<<"\\nPositive: "<<p<<"\\nNegative: "<<q<<"\\n"; }\n',
  wrong={'wrong-negative-mod.cpp': CPP + 'int main(){ int n; cin>>n; int e=0,o=0,p=0,q=0; while(n--){ int x; cin>>x; '
                 'if(x%2==1) o++; else e++; if(x>0) p++; if(x<0) q++; } '
                 'cout<<"Even: "<<e<<"\\nOdd: "<<o<<"\\nPositive: "<<p<<"\\nNegative: "<<q<<"\\n"; }\n'},
  gen=lambda r: ['1\n0', '1\n-1', '1\n100000', '1\n-100000', '4\n-7 -9 -11 -1', '6\n0 0 0 0 0 0',
                 '1000\n' + nums(r, 1000, -100000, 100000), '1000\n' + nums(r, 1000, -3, 3),
                 '1000\n' + nums(r, 1000, -100000, -1)]
                + [f'{n}\n{nums(r, n, -100000, 100000)}' for n in (ri(r, 1, 1000) for _ in range(5))])


# ---------------------------------------------------------------- D
def gen_password(r):
    w = lambda: str(r.choice([ri(r, 1000, 1998), ri(r, 2000, 9999)]))
    tests = ['1999', '1999\n1999\n1000', '1000\n9999\n1998\n2000\n1999', '1999\n' + '\n'.join(w() for _ in range(50)),
             '\n'.join(w() for _ in range(1000)) + '\n1999',
             '\n'.join(w() for _ in range(300)) + '\n1999\n' + '\n'.join(w() for _ in range(300))]
    tests += ['\n'.join(w() for _ in range(ri(r, 1, 40))) + '\n1999' for _ in range(4)]
    return tests


P(letter='D', name='s2-fixed-password', title='Fixed Password', tl=1000, ml=256, checker=WCMP,
  legend='A system accepts only the password $1999$. You are given the passwords typed, one per line. For each one, '
         'print "Wrong" if it is not the correct password. As soon as the correct password is typed, print "Correct" '
         'and stop: ignore everything after it.',
  input='Several lines, each with an integer $X$ ($10^3 \\le X \\le 10^4 - 1$). The password $1999$ appears at least once.',
  output='For every password up to and including the first correct one, print "Wrong" or "Correct" on its own line.',
  samples=[('2200\n1020\n1999\n1000\n9999', 'Wrong\nWrong\nCorrect')],
  solution=CPP + 'int main(){ int x; while(cin>>x){ if(x==1999){ cout<<"Correct\\n"; break; } cout<<"Wrong\\n"; } }\n',
  wrong={'wrong-no-stop.cpp': CPP + 'int main(){ int x; while(cin>>x){ cout<<(x==1999?"Correct":"Wrong")<<"\\n"; } }\n'},
  gen=gen_password)

# ---------------------------------------------------------------- E
P(letter='E', name='s2-max', title='Max', tl=1000, ml=256, checker=WCMP,
  legend='You are given $N$ integers. Print the largest of them.',
  input='The first line contains $N$ ($1 \\le N \\le 10^3$). The second line contains $N$ integers $X_i$ '
        '($0 \\le X_i \\le 10^9$).',
  output='Print the maximum.',
  samples=[('5\n1 8 5 7 5', '8')],
  solution=CPP + 'int main(){ int n; cin>>n; long long m=-1; while(n--){ long long x; cin>>x; m=max(m,x); } cout<<m<<"\\n"; }\n',
  gen=lambda r: ['1\n0', '1\n1000000000', '3\n0 0 0', '5\n1000000000 1 2 3 4', '5\n1 2 3 4 1000000000',
                 '1000\n' + nums(r, 1000, 0, 10**9), '1000\n' + ' '.join(['1000000000'] * 1000),
                 '1000\n' + nums(r, 1000, 0, 10)]
                + [f'{n}\n{nums(r, n, 0, 10**9)}' for n in (ri(r, 1, 1000) for _ in range(4))])

# ---------------------------------------------------------------- F
P(letter='F', name='s2-multiplication-table', title='Multiplication Table', tl=1000, ml=64, checker=WCMP,
  legend='You are given an integer $N$. Print its multiplication table from $1$ to $12$.',
  input='One line with an integer $N$ ($1 \\le N \\le 50$).',
  output='Print $12$ lines. Line $i$ is "$N$ * $i$ = $R$", where $R = N \\cdot i$.',
  samples=[('1', '\n'.join(f'1 * {i} = {i}' for i in range(1, 13))),
           ('2', '\n'.join(f'2 * {i} = {2 * i}' for i in range(1, 13)))],
  solution=CPP + 'int main(){ int n; cin>>n; for(int i=1;i<=12;i++) cout<<n<<" * "<<i<<" = "<<n*i<<"\\n"; }\n',
  gen=lambda r: ['50', '49', '12', '7', '10'] + [str(ri(r, 1, 50)) for _ in range(4)])

# ---------------------------------------------------------------- G
P(letter='G', name='s2-factorial', title='Factorial', tl=2000, ml=64, checker=WCMP,
  legend='For each given integer $N$, print $N!$, the product $1 \\cdot 2 \\cdot \\ldots \\cdot N$. By definition $0! = 1$.',
  input='The first line contains $T$ ($1 \\le T \\le 15$), the number of test cases. Each of the next $T$ lines '
        'contains an integer $N$ ($0 \\le N \\le 20$).',
  output='For each test case print $N!$ on its own line.',
  notes='$20!$ does not fit in a 32-bit \\texttt{int}.',
  samples=[('2\n5\n3', '120\n6')],
  solution=CPP + 'int main(){ int t; cin>>t; while(t--){ int n; cin>>n; long long f=1; for(int i=2;i<=n;i++) f*=i; cout<<f<<"\\n"; } }\n',
  wrong={'wrong-int.cpp': CPP + 'int main(){ int t; cin>>t; while(t--){ int n; cin>>n; int f=1; for(int i=2;i<=n;i++) f*=i; cout<<f<<"\\n"; } }\n'},
  gen=lambda r: [multi(['0']), multi(['1']), multi(['20']), multi([str(i) for i in range(6, 21)]),
                 multi(['13', '12', '0', '20']), multi([str(ri(r, 0, 20)) for _ in range(15)]),
                 multi([str(ri(r, 0, 20)) for _ in range(15)])])

# ---------------------------------------------------------------- H
P(letter='H', name='s2-one-prime', title='One Prime', tl=3000, ml=64, checker=WCMP,
  legend='You are given an integer $X$. Decide whether it is prime: a prime is greater than $1$ and divisible only '
         'by $1$ and itself.',
  input='One line with an integer $X$ ($2 \\le X \\le 10^5$).',
  output='Print "YES" if $X$ is prime, otherwise "NO".',
  notes='$7$ is prime: none of $2, \\ldots, 6$ divides it. $15$ is not: it is divisible by $3$ and $5$.',
  samples=[('7', 'YES'), ('15', 'NO')],
  solution=CPP + 'int main(){ int x; cin>>x; bool p=x>1; for(int i=2;1LL*i*i<=x;i++) if(x%i==0) p=false; cout<<(p?"YES":"NO")<<"\\n"; }\n',
  wrong={'wrong-odd-check.cpp': CPP + 'int main(){ int x; cin>>x; cout<<((x==2||x%2)?"YES":"NO")<<"\\n"; }\n'},
  gen=lambda r: ['2', '3', '4', '9', '25', '49', '99991', '100000', '97969', '99221', '65537', '99989', '91', '1369']
                + [str(ri(r, 2, 100000)) for _ in range(4)])

# ---------------------------------------------------------------- I
P(letter='I', name='s2-palindrome', title='Palindrome', tl=1000, ml=256, checker=WCMP,
  legend='You are given an integer $N$. Print $N$ with its digits reversed (without leading zeros), then say whether '
         '$N$ is a palindrome: a number that reads the same from both ends, like $12321$ or $101$.',
  input='One line with an integer $N$ ($1 \\le N \\le 10^7$).',
  output='On the first line print $N$ reversed, with no leading zeros. On the second line print "YES" if $N$ is a '
         'palindrome, otherwise "NO".',
  notes='$160$ reversed is $061$, printed as $61$.',
  samples=[('12121', '12121\nYES'), ('160', '61\nNO')],
  solution=CPP + 'int main(){ long long n; cin>>n; long long r=0,m=n; while(m){ r=r*10+m%10; m/=10; } '
                 'cout<<r<<"\\n"<<(r==n?"YES":"NO")<<"\\n"; }\n',
  wrong={'wrong-leading-zeros.cpp': CPP + 'int main(){ string s; cin>>s; string t(s.rbegin(),s.rend()); '
                                          'cout<<t<<"\\n"<<(s==t?"YES":"NO")<<"\\n"; }\n'},
  gen=lambda r: ['1', '9', '10', '100', '10000000', '9999999', '1234321', '1200021', '1201', '221', '1000001', '5000']
                + [str(ri(r, 1, 10**7)) for _ in range(4)])

# ---------------------------------------------------------------- J
P(letter='J', name='s2-primes-1-to-n', title='Primes from 1 to N', tl=3000, ml=256, checker=WCMP,
  legend='You are given an integer $N$. Print every prime number between $1$ and $N$ (inclusive).',
  input='One line with an integer $N$ ($2 \\le N \\le 10^3$).',
  output='Print the primes in increasing order, separated by spaces.',
  notes='$1$ is not prime.',
  samples=[('10', '2 3 5 7')],
  solution=CPP + 'int main(){ int n; cin>>n; for(int x=2;x<=n;x++){ bool p=true; for(int i=2;i*i<=x;i++) if(x%i==0) p=false; '
                 'if(p) cout<<x<<" "; } cout<<"\\n"; }\n',
  gen=lambda r: ['2', '3', '4', '1000', '997', '998', '121'] + [str(ri(r, 2, 1000)) for _ in range(4)])

# ---------------------------------------------------------------- K
P(letter='K', name='s2-divisors', title='Divisors', tl=1000, ml=256, checker=WCMP,
  legend='You are given an integer $N$. Print all its positive divisors in increasing order. A divisor of $N$ divides '
         'it with no remainder.',
  input='One line with an integer $N$ ($1 \\le N \\le 10^4$).',
  output='Print the divisors of $N$, one per line, in increasing order.',
  samples=[('6', '1\n2\n3\n6'), ('7', '1\n7'), ('4', '1\n2\n4')],
  solution=CPP + 'int main(){ int n; cin>>n; for(int i=1;i<=n;i++) if(n%i==0) cout<<i<<"\\n"; }\n',
  gen=lambda r: ['1', '2', '9973', '10000', '9216', '7560', '5040'] + [str(ri(r, 1, 10000)) for _ in range(4)])

# ---------------------------------------------------------------- L
P(letter='L', name='s2-gcd', title='GCD', tl=1000, ml=256, checker=WCMP,
  legend='You are given two integers $A$ and $B$. Print their greatest common divisor: the largest positive integer '
         'that divides both.',
  input='One line with two integers $A$ and $B$ ($1 \\le A, B \\le 10^3$).',
  output='Print $\\gcd(A, B)$.',
  notes='The divisors of $54$ are $1, 2, 3, 6, 9, 18, 27, 54$ and those of $24$ are $1, 2, 3, 4, 6, 8, 12, 24$, '
        'so $\\gcd(54, 24) = 6$.',
  samples=[('12 8', '4'), ('3 7', '1'), ('5 10', '5')],
  solution=CPP + 'int main(){ int a,b; cin>>a>>b; while(b){ int t=a%b; a=b; b=t; } cout<<a<<"\\n"; }\n',
  gen=lambda r: ['1 1', '1000 1000', '1 1000', '1000 1', '997 991', '512 768', '1000 500', '999 333', '840 720']
                + [f'{ri(r, 1, 1000)} {ri(r, 1, 1000)}' for _ in range(5)])

# ---------------------------------------------------------------- M
P(letter='M', name='s2-lucky-numbers', title='Lucky Numbers', tl=1000, ml=256, checker=WCMP,
  legend='You are given two integers $A$ and $B$. A lucky number is a positive integer whose decimal digits are all '
         '$4$ or $7$ (for example $4$, $7$, $47$, $744$; but not $5$, $17$ or $174$). Print all lucky numbers between '
         '$A$ and $B$ (inclusive).',
  input='One line with two integers $A$ and $B$ ($1 \\le A \\le B \\le 10^5$).',
  output='Print the lucky numbers in increasing order separated by spaces, or $-1$ if there is none.',
  samples=[('4 20', '4 7'), ('8 15', '-1')],
  solution=CPP + 'int main(){ int a,b; cin>>a>>b; bool any=false; for(int x=a;x<=b;x++){ int y=x; bool ok=true; '
                 'while(y){ if(y%10!=4&&y%10!=7) ok=false; y/=10; } if(ok){ cout<<x<<" "; any=true; } } '
                 'if(!any) cout<<-1; cout<<"\\n"; }\n',
  gen=lambda r: ['1 3', '1 100000', '4 4', '7 7', '44 77', '77777 100000', '77778 100000', '5 6', '48 73',
                 '74 74', '100 400']
                + [f'{a} {ri(r, a, 100000)}' for a in (ri(r, 1, 100000) for _ in range(4))])

# ---------------------------------------------------------------- N
P(letter='N', name='s2-numbers-histogram', title='Numbers Histogram', tl=1000, ml=256, checker=LINES,
  legend='You are given a symbol $S$ and $N$ numbers. For each number $X_i$, print a line with $S$ repeated $X_i$ times.',
  input='The first line contains the symbol $S$, one of \\texttt{+}, \\texttt{-}, \\texttt{*}, \\texttt{/}. The second '
        'line contains $N$ ($1 \\le N \\le 50$). The third line contains $N$ integers $X_i$ ($1 \\le X_i \\le 100$).',
  output='Print $N$ lines as described.',
  notes='Do not print spaces after the symbols.',
  samples=[('+\n5\n5 2 4 3 7', '+++++\n++\n++++\n+++\n+++++++')],
  solution=CPP + 'int main(){ char s; int n; cin>>s>>n; while(n--){ int x; cin>>x; cout<<string(x,s)<<"\\n"; } }\n',
  gen=lambda r: ['-\n1\n1', '*\n1\n100', '/\n50\n' + nums(r, 50, 1, 100), '+\n50\n' + ' '.join(['100'] * 50),
                 '*\n3\n1 1 1']
                + [f'{r.choice("+-*/")}\n{n}\n{nums(r, n, 1, 100)}' for n in (ri(r, 1, 50) for _ in range(4))])


# ---------------------------------------------------------------- O, P, T, W (patterns)
def shape_tests(r):
    return ['1', '2', '3', '10', '50', '98', '99'] + [str(ri(r, 4, 97)) for _ in range(3)]


def pyramid(n):
    return '\n'.join(' ' * (n - i) + '*' * (2 * i - 1) for i in range(1, n + 1))


P(letter='O', name='s2-pyramid', title='Pyramid', tl=1000, ml=256, checker=LINES,
  legend='You are given an integer $N$. Print a right triangle of stars with $N$ rows: row $i$ has $i$ stars.',
  input=SHAPE_INPUT, output='Print the triangle, as in the example.', notes=SHAPE_NOTE,
  samples=[('4', '*\n**\n***\n****')],
  solution=CPP + 'int main(){ int n; cin>>n; for(int i=1;i<=n;i++) cout<<string(i,\'*\')<<"\\n"; }\n',
  gen=shape_tests)

P(letter='P', name='s2-shape1', title='Shape1', tl=1000, ml=256, checker=LINES,
  legend='You are given an integer $N$. Print an upside-down right triangle of stars with $N$ rows: the first row '
         'has $N$ stars and each next row has one star fewer.',
  input=SHAPE_INPUT, output='Print the triangle, as in the example.', notes=SHAPE_NOTE,
  samples=[('4', '****\n***\n**\n*')],
  solution=CPP + 'int main(){ int n; cin>>n; for(int i=n;i>=1;i--) cout<<string(i,\'*\')<<"\\n"; }\n',
  gen=shape_tests)

# ---------------------------------------------------------------- Q
P(letter='Q', name='s2-digits', title='Digits', tl=1000, ml=256, checker=WCMP,
  legend='For each given integer $N$, print its digits from right to left.',
  input='The first line contains $T$ ($1 \\le T \\le 10$), the number of test cases. Each of the next $T$ lines '
        'contains an integer $N$ ($0 \\le N \\le 10^9$).',
  output='For each test case print one line with the digits of $N$ from right to left, separated by spaces.',
  samples=[('4\n121\n39\n123456\n1200', '1 2 1\n9 3\n6 5 4 3 2 1\n0 0 2 1')],
  solution=CPP + 'int main(){ int t; cin>>t; while(t--){ string s; cin>>s; for(int i=s.size()-1;i>=0;i--) cout<<s[i]<<" "; cout<<"\\n"; } }\n',
  wrong={'wrong-zero.cpp': CPP + 'int main(){ int t; cin>>t; while(t--){ int n; cin>>n; while(n){ cout<<n%10<<" "; n/=10; } cout<<"\\n"; } }\n'},
  gen=lambda r: [multi(['0']), multi(['1000000000']), multi(['0', '7', '10', '999999999', '1000000000', '120']),
                 multi([str(ri(r, 0, 10**9)) for _ in range(10)]), multi([str(ri(r, 0, 1000)) for _ in range(10)])])


# ---------------------------------------------------------------- R
def gen_seq(r):
    pos = lambda: f'{ri(r, 1, 100)} {ri(r, 1, 100)}'
    stop = lambda: r.choice([f'{ri(r, -100, 0)} {ri(r, -100, 100)}', f'{ri(r, -100, 100)} {ri(r, -100, 0)}'])
    return ['0 5', '5 0', '-100 -100', '1 1\n0 0', '100 1\n1 100\n100 100\n1 -1', '7 3\n3 7\n-5 10',
            '\n'.join(pos() for _ in range(100)) + '\n0 0',
            '\n'.join(pos() for _ in range(30)) + '\n50 -3\n4 6'] \
        + ['\n'.join(pos() for _ in range(ri(r, 1, 20))) + '\n' + stop() for _ in range(4)]


P(letter='R', name='s2-sequence-and-sum', title='Sequence of Numbers and Sum', tl=1000, ml=256, checker=WCMP,
  legend='You are given lines with two integers $N$ and $M$. For each line, print the integers from $\\min(N, M)$ to '
         '$\\max(N, M)$, then "sum =" and their sum. Stop as soon as a line has a number less than or equal to zero; '
         'print nothing for that line.',
  input='Several lines, each with two integers $N$ and $M$ ($-100 \\le N, M \\le 100$). The last line contains a '
        'number less than or equal to zero.',
  output='For every line before the stopping line, print the numbers separated by single spaces, then " sum =" '
         'immediately followed by the sum, as in the examples.',
  notes='$M$ can be smaller than $N$.',
  samples=[('5 2\n5 7\n5 -1', '2 3 4 5 sum =14\n5 6 7 sum =18'), ('5 2\n6 3\n5 0', '2 3 4 5 sum =14\n3 4 5 6 sum =18')],
  solution=CPP + 'int main(){ int n,m; while(cin>>n>>m){ if(n<=0||m<=0) break; if(n>m) swap(n,m); int s=0; '
                 'for(int i=n;i<=m;i++){ cout<<i<<" "; s+=i; } cout<<"sum ="<<s<<"\\n"; } }\n',
  gen=gen_seq)

# ---------------------------------------------------------------- S
P(letter='S', name='s2-sum-of-odd-numbers', title='Sum of Consecutive Odd Numbers', tl=1000, ml=256, checker=WCMP,
  legend='For each pair of integers $X$ and $Y$, print the sum of all odd numbers strictly between them '
         '($X$ and $Y$ themselves are not included).',
  input='The first line contains $T$ ($1 \\le T \\le 10$), the number of test cases. Each of the next $T$ lines '
        'contains two integers $X$ and $Y$ ($0 \\le X, Y \\le 10^4$).',
  output='For each test case print the sum on its own line.',
  notes='$X$ can be larger than $Y$.',
  samples=[('3\n5 6\n10 4\n4 9', '0\n21\n12')],
  solution=CPP + 'int main(){ int t; cin>>t; while(t--){ int x,y; cin>>x>>y; if(x>y) swap(x,y); long long s=0; '
                 'for(int i=x+1;i<y;i++) if(i%2) s+=i; cout<<s<<"\\n"; } }\n',
  wrong={'wrong-inclusive.cpp': CPP + 'int main(){ int t; cin>>t; while(t--){ int x,y; cin>>x>>y; if(x>y) swap(x,y); '
                                      'long long s=0; for(int i=x;i<=y;i++) if(i%2) s+=i; cout<<s<<"\\n"; } }\n'},
  gen=lambda r: [multi(['0 0']), multi(['7 7']), multi(['1 9', '9 1', '1 2', '0 1', '3 5']),
                 multi(['0 10000', '10000 0', '1 9999', '9999 1']),
                 multi([f'{ri(r, 0, 10000)} {ri(r, 0, 10000)}' for _ in range(10)]),
                 multi([f'{ri(r, 0, 20)} {ri(r, 0, 20)}' for _ in range(10)])])

P(letter='T', name='s2-shape2', title='Shape2', tl=1000, ml=256, checker=LINES,
  legend='You are given an integer $N$. Print a centred pyramid of stars with $N$ rows: row $i$ has $N - i$ spaces '
         'followed by $2i - 1$ stars.',
  input=SHAPE_INPUT, output='Print the pyramid, as in the example.', notes=SHAPE_NOTE,
  samples=[('4', pyramid(4))],
  solution=CPP + 'int main(){ int n; cin>>n; for(int i=1;i<=n;i++) cout<<string(n-i,\' \')<<string(2*i-1,\'*\')<<"\\n"; }\n',
  wrong={'wrong-no-indent.cpp': CPP + 'int main(){ int n; cin>>n; for(int i=1;i<=n;i++) cout<<string(2*i-1,\'*\')<<"\\n"; }\n'},
  gen=shape_tests)

# ---------------------------------------------------------------- U
P(letter='U', name='s2-some-sums', title='Some Sums', tl=2000, ml=256, checker=WCMP,
  legend='You are given $N$, $A$ and $B$. Print the sum of all integers from $1$ to $N$ whose digit sum is between '
         '$A$ and $B$ (inclusive).',
  input='One line with three integers $N$, $A$, $B$ ($1 \\le N \\le 10^4$, $1 \\le A \\le B \\le 36$).',
  output='Print the sum.',
  notes='Up to $20$, the numbers with digit sum between $2$ and $5$ are $2, 3, 4, 5, 11, 12, 13, 14, 20$; '
        'their sum is $84$.',
  samples=[('20 2 5', '84'), ('10 1 2', '13'), ('100 4 16', '4554')],
  solution=CPP + 'int main(){ int n,a,b; cin>>n>>a>>b; long long s=0; for(int x=1;x<=n;x++){ int d=0,y=x; '
                 'while(y){ d+=y%10; y/=10; } if(d>=a&&d<=b) s+=x; } cout<<s<<"\\n"; }\n',
  gen=lambda r: ['1 1 36', '10000 1 36', '10000 36 36', '9999 36 36', '10000 1 1', '1 2 36', '9998 35 36', '5000 10 20']
                + [f'{ri(r, 1, 10000)} {a} {ri(r, a, 36)}' for a in (ri(r, 1, 36) for _ in range(4))])

# ---------------------------------------------------------------- V
P(letter='V', name='s2-pum', title='PUM', tl=1000, ml=256, checker=WCMP,
  legend='You are given an integer $N$. Print $N$ lines of the PUM game: count up from $1$, and every fourth number '
         'is replaced by the word "PUM", which also ends the line.',
  input='One line with an integer $N$ ($1 \\le N \\le 20$).',
  output='Print $N$ lines, as in the examples.',
  samples=[('7', '\n'.join(f'{4*i-3} {4*i-2} {4*i-1} PUM' for i in range(1, 8))),
           ('3', '\n'.join(f'{4*i-3} {4*i-2} {4*i-1} PUM' for i in range(1, 4)))],
  solution=CPP + 'int main(){ int n; cin>>n; for(int i=1;i<=n;i++) cout<<4*i-3<<" "<<4*i-2<<" "<<4*i-1<<" PUM\\n"; }\n',
  gen=lambda r: ['1', '2', '20', '19', '10'])

# ---------------------------------------------------------------- W
P(letter='W', name='s2-shape3', title='Shape3', tl=1000, ml=256, checker=LINES,
  legend='You are given an integer $N$. Print a diamond of $2N$ rows: the pyramid from Shape2 with $N$ rows, '
         'followed by the same pyramid upside down.',
  input=SHAPE_INPUT, output='Print the diamond, as in the example.', notes=SHAPE_NOTE,
  samples=[('4', pyramid(4) + '\n' + '\n'.join(reversed(pyramid(4).split('\n'))))],
  solution=CPP + 'int main(){ int n; cin>>n; for(int i=1;i<=n;i++) cout<<string(n-i,\' \')<<string(2*i-1,\'*\')<<"\\n"; '
                 'for(int i=n;i>=1;i--) cout<<string(n-i,\' \')<<string(2*i-1,\'*\')<<"\\n"; }\n',
  wrong={'wrong-no-indent.cpp': CPP + 'int main(){ int n; cin>>n; for(int i=1;i<=n;i++) cout<<string(2*i-1,\'*\')<<"\\n"; '
                                      'for(int i=n;i>=1;i--) cout<<string(2*i-1,\'*\')<<"\\n"; }\n'},
  gen=shape_tests)

# ---------------------------------------------------------------- X
P(letter='X', name='s2-convert-to-decimal-2', title='Convert To Decimal 2', tl=1000, ml=64, checker=WCMP,
  legend='For each given integer $N$: write $N$ in binary, count its ones $K$, and print the number whose binary form '
         'is $K$ ones (that is, $2^K - 1$).',
  input='The first line contains $T$ ($1 \\le T \\le 10$), the number of test cases. Each of the next $T$ lines '
        'contains an integer $N$ ($1 \\le N \\le 2^{31} - 1$).',
  output='For each test case print the answer on its own line.',
  notes='$10$ is $1010$ in binary. It has $2$ ones, and $11$ in binary is $3$.',
  samples=[('3\n10\n7\n8', '3\n7\n1')],
  solution=CPP + 'int main(){ int t; cin>>t; while(t--){ long long n; cin>>n; int k=0; while(n){ k+=n&1; n>>=1; } '
                 'cout<<(1LL<<k)-1<<"\\n"; } }\n',
  gen=lambda r: [multi(['1']), multi(['2147483647']), multi(['1073741824', '2147483646', '1073741823', '2']),
                 multi([str(ri(r, 1, 2**31 - 1)) for _ in range(10)]), multi([str(ri(r, 1, 1000)) for _ in range(10)])])

# ---------------------------------------------------------------- Y
P(letter='Y', name='s2-easy-fibonacci', title='Easy Fibonacci', tl=1000, ml=256, checker=WCMP,
  legend='You are given an integer $N$. Print the first $N$ numbers of the Fibonacci sequence, defined by '
         '$fib(1) = 0$, $fib(2) = 1$ and $fib(n) = fib(n-1) + fib(n-2)$.',
  input='One line with an integer $N$ ($1 \\le N \\le 45$).',
  output='Print $fib(1), \\ldots, fib(N)$ separated by spaces.',
  samples=[('7', '0 1 1 2 3 5 8')],
  solution=CPP + 'int main(){ int n; cin>>n; long long a=0,b=1; for(int i=0;i<n;i++){ cout<<a<<" "; long long c=a+b; a=b; b=c; } cout<<"\\n"; }\n',
  gen=lambda r: ['1', '2', '3', '45', '44', '20'])

# ---------------------------------------------------------------- Z
P(letter='Z', name='s2-three-numbers', title='Three Numbers', tl=3000, ml=256, checker=WCMP,
  legend='You are given $K$ and $S$. Count the triples of integers $(X, Y, Z)$ with $0 \\le X, Y, Z \\le K$ and '
         '$X + Y + Z = S$.',
  input='One line with two integers $K$ and $S$ ($0 \\le K \\le 3000$, $0 \\le S \\le 3K$).',
  output='Print the number of triples.',
  notes='For $K = 2$, $S = 1$ the triples are $(0, 0, 1)$, $(0, 1, 0)$ and $(1, 0, 0)$.',
  samples=[('2 1', '3'), ('9 4', '15')],
  solution=CPP + 'int main(){ int k,s; cin>>k>>s; long long c=0; for(int x=0;x<=k;x++) for(int y=0;y<=k;y++){ int z=s-x-y; '
                 'if(z>=0&&z<=k) c++; } cout<<c<<"\\n"; }\n',
  wrong={'wrong-cubic.cpp': CPP + 'int main(){ int k,s; cin>>k>>s; long long c=0; for(int x=0;x<=k;x++) for(int y=0;y<=k;y++) '
                                  'for(int z=0;z<=k;z++) if(x+y+z==s) c++; cout<<c<<"\\n"; }\n'},
  gen=lambda r: ['0 0', '1 3', '3000 0', '3000 9000', '3000 4500', '3000 3000', '3000 6000', '2999 4498', '1 1']
                + [f'{k} {ri(r, 0, 3 * k)}' for k in (ri(r, 1, 3000) for _ in range(4))])
