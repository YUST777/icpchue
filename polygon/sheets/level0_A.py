"""ICPC HUE Level 0, Sheet 1 (Data Types & Conditions), problems D-Z.

Same tasks, formats and samples as the training sheet; statements in our own
words. A-C live as hand-made folders in polygon/level0-sheet1.
"""

CPP = '#include <bits/stdc++.h>\nusing namespace std;\n'
TOK4 = {'custom': 'tok_real', 'eps': 1e-4}


def ri(rng, lo, hi):
    return rng.randint(lo, hi)


def real(rng, lo, hi, digits):
    return f'{rng.uniform(lo, hi):.{digits}f}'


PROBLEMS = []


def P(**kw):
    PROBLEMS.append(kw)


# ---------------------------------------------------------------- D
P(letter='D', name='difference', title='Difference', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given four integers $A$, $B$, $C$ and $D$. Compute $X = (A \\cdot B) - (C \\cdot D)$.',
  input='One line with four integers $A$, $B$, $C$, $D$ ($-10^5 \\le A, B, C, D \\le 10^5$).',
  output='Print "Difference = " (without the quotes) followed by $X$.',
  notes='The products can be much larger than an \\texttt{int} can hold.',
  samples=[('1 2 3 4', 'Difference = -10'), ('2 3 4 5', 'Difference = -14'), ('4 5 2 3', 'Difference = 14')],
  solution=CPP + 'int main(){ long long a,b,c,d; cin>>a>>b>>c>>d; cout<<"Difference = "<<a*b-c*d<<"\\n"; }\n',
  wrong={'wrong-int.cpp': CPP + 'int main(){ int a,b,c,d; cin>>a>>b>>c>>d; cout<<"Difference = "<<a*b-c*d<<"\\n"; }\n'},
  gen=lambda r: ['100000 100000 -100000 100000', '-100000 -100000 100000 100000', '0 0 0 0',
                 '100000 -100000 100000 100000', '-100000 100000 -100000 -100000', '1 1 1 1', '99999 99999 0 5']
                + [' '.join(str(ri(r, -100000, 100000)) for _ in range(4)) for _ in range(10)])

# ---------------------------------------------------------------- E
P(letter='E', name='area-of-a-circle', title='Area of a Circle', tl=1000, ml=256, checker='std::rcmp6.cpp',
  legend='Given the radius $R$ of a circle, compute its area $\\pi \\cdot R^2$. Use $\\pi = 3.141592653$.',
  input='One line with a real number $R$ ($1 \\le R \\le 100$).',
  output='Print the area with exactly 9 digits after the decimal point.',
  notes='Use \\texttt{double}, and print with \\texttt{fixed} and \\texttt{setprecision(9)} from \\texttt{<iomanip>}.',
  samples=[('2.00', '12.566370612')],
  solution=CPP + 'int main(){ double r; cin>>r; cout<<fixed<<setprecision(9)<<3.141592653*r*r<<"\\n"; }\n',
  gen=lambda r: ['1.00', '100.00', '1', '100', '50.50', '99.99', '1.01', '33.33']
                + [real(r, 1, 100, 2) for _ in range(8)])

# ---------------------------------------------------------------- F
P(letter='F', name='digits-summation', title='Digits Summation', tl=1000, ml=64, checker='std::wcmp.cpp',
  legend='You are given two numbers $N$ and $M$. Print the sum of their last digits.',
  input='One line with two integers $N$ and $M$ ($0 \\le N, M \\le 10^{18}$).',
  output='Print the sum of the last digit of $N$ and the last digit of $M$.',
  notes='In the example the last digits are 3 and 2, so the answer is $3 + 2 = 5$.',
  samples=[('13 12', '5')],
  solution=CPP + 'int main(){ long long n,m; cin>>n>>m; cout<<n%10+m%10<<"\\n"; }\n',
  wrong={'wrong-int.cpp': CPP + 'int main(){ int n,m; cin>>n>>m; cout<<n%10+m%10<<"\\n"; }\n'},
  gen=lambda r: ['0 0', '1000000000000000000 1000000000000000000', '999999999999999999 999999999999999999',
                 '9 9', '123456789012345678 987654321098765437', '10 1', '5000000000 7']
                + [f'{ri(r, 0, 10**18)} {ri(r, 0, 10**18)}' for _ in range(8)])

# ---------------------------------------------------------------- G
P(letter='G', name='summation-1-to-n', title='Summation from 1 to N', tl=250, ml=256, checker='std::wcmp.cpp',
  legend='You are given a number $N$. Print the sum of all integers from $1$ to $N$ inclusive: $\\sum_{i=1}^{N} i$.',
  input='One line with an integer $N$ ($1 \\le N \\le 10^9$).',
  output='Print the sum $1 + 2 + \\ldots + N$.',
  notes='For $N = 3$ the sum is $1 + 2 + 3 = 6$; for $N = 10$ it is 55. A loop up to $10^9$ is too slow for the time limit.',
  samples=[('3', '6'), ('10', '55')],
  solution=CPP + 'int main(){ long long n; cin>>n; cout<<n*(n+1)/2<<"\\n"; }\n',
  wrong={'wrong-int.cpp': CPP + 'int main(){ int n; cin>>n; cout<<n*(n+1)/2<<"\\n"; }\n'},
  gen=lambda r: ['1', '2', '1000000000', '999999999', '65536', '46341', '100000']
                + [str(ri(r, 1, 10**9)) for _ in range(8)])

# ---------------------------------------------------------------- H
P(letter='H', name='two-numbers', title='Two numbers', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given two positive integers $A$ and $B$. Print the floor, the ceiling and the rounded value of $A / B$.'
         '\\begin{itemize}\\item The floor of $X$ is the greatest integer not greater than $X$.'
         '\\item The ceiling of $X$ is the smallest integer not less than $X$.'
         '\\item Rounding gives the closest integer to $X$; a value exactly halfway (like 2.5) rounds up.\\end{itemize}',
  input='One line with two integers $A$ and $B$ ($1 \\le A, B \\le 10^3$).',
  output='Print three lines, in this order: "floor $A$ / $B$ = $F$", "ceil $A$ / $B$ = $C$" and "round $A$ / $B$ = $R$", '
         'where $F$, $C$ and $R$ are the floor, ceiling and rounded value of $A / B$.',
  samples=[('10 3', 'floor 10 / 3 = 3\nceil 10 / 3 = 4\nround 10 / 3 = 3'),
           ('10 4', 'floor 10 / 4 = 2\nceil 10 / 4 = 3\nround 10 / 4 = 3'),
           ('10 6', 'floor 10 / 6 = 1\nceil 10 / 6 = 2\nround 10 / 6 = 2')],
  solution=CPP + 'int main(){ long long a,b; cin>>a>>b; cout<<"floor "<<a<<" / "<<b<<" = "<<a/b<<"\\n"'
                 '<<"ceil "<<a<<" / "<<b<<" = "<<(a+b-1)/b<<"\\n"<<"round "<<a<<" / "<<b<<" = "<<(2*a+b)/(2*b)<<"\\n"; }\n',
  gen=lambda r: ['1 1', '1000 1', '1 1000', '5 2', '7 2', '999 1000', '1000 999', '6 3', '500 1000', '3 2']
                + [f'{ri(r, 1, 1000)} {ri(r, 1, 1000)}' for _ in range(8)])

# ---------------------------------------------------------------- I
P(letter='I', name='welcome-conditions', title='Welcome for you with Conditions', tl=1000, ml=64, checker='std::wcmp.cpp',
  legend='You are given two numbers $A$ and $B$. Print "Yes" if $A$ is greater than or equal to $B$, and "No" otherwise.',
  input='One line with two integers $A$ and $B$ ($0 \\le A, B \\le 100$).',
  output='Print "Yes" or "No".',
  samples=[('10 9', 'Yes'), ('5 5', 'Yes'), ('5 7', 'No')],
  solution=CPP + 'int main(){ int a,b; cin>>a>>b; cout<<(a>=b?"Yes":"No")<<"\\n"; }\n',
  wrong={'wrong-strict.cpp': CPP + 'int main(){ int a,b; cin>>a>>b; cout<<(a>b?"Yes":"No")<<"\\n"; }\n'},
  gen=lambda r: ['0 0', '100 100', '0 100', '100 0', '1 0', '0 1', '50 50']
                + [f'{ri(r, 0, 100)} {ri(r, 0, 100)}' for _ in range(6)])

# ---------------------------------------------------------------- J
P(letter='J', name='multiples', title='Multiples', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given two numbers $A$ and $B$. Print "Multiples" if one of them is a multiple of the other '
         '(that is, $A$ divides $B$ or $B$ divides $A$), and "No Multiples" otherwise.',
  input='One line with two integers $A$ and $B$ ($1 \\le A, B \\le 10^6$).',
  output='Print "Multiples" or "No Multiples".',
  notes='9 is divisible by 3, so the first answer is "Multiples". 24 is divisible by 6, so the second is "Multiples" too. '
        'Neither of 12 and 5 divides the other.',
  samples=[('9 3', 'Multiples'), ('6 24', 'Multiples'), ('12 5', 'No Multiples')],
  solution=CPP + 'int main(){ long long a,b; cin>>a>>b; cout<<((a%b==0||b%a==0)?"Multiples":"No Multiples")<<"\\n"; }\n',
  wrong={'wrong-one-way.cpp': CPP + 'int main(){ long long a,b; cin>>a>>b; cout<<(a%b==0?"Multiples":"No Multiples")<<"\\n"; }\n'},
  gen=lambda r: ['1 1', '1 1000000', '1000000 1', '1000000 1000000', '999983 999979', '7 49', '49 7', '500000 1000000', '2 3']
                + [f'{ri(r, 1, 10**6)} {ri(r, 1, 10**6)}' for _ in range(5)]
                + [(lambda a: f'{a} {a * ri(r, 1, 10**6 // a)}')(ri(r, 1, 1000)) for _ in range(3)])

# ---------------------------------------------------------------- K
P(letter='K', name='max-and-min', title='Max and Min', tl=1000, ml=64, checker='std::wcmp.cpp',
  legend='You are given three numbers $A$, $B$ and $C$. Print the smallest and the largest of them.',
  input='One line with three integers $A$, $B$, $C$ ($-10^5 \\le A, B, C \\le 10^5$).',
  output='Print the minimum, a single space, then the maximum.',
  samples=[('1 2 3', '1 3'), ('-1 -2 -3', '-3 -1'), ('10 20 -5', '-5 20')],
  solution=CPP + 'int main(){ long long a,b,c; cin>>a>>b>>c; cout<<min({a,b,c})<<" "<<max({a,b,c})<<"\\n"; }\n',
  gen=lambda r: ['5 5 5', '-100000 100000 0', '100000 100000 -100000', '0 0 1', '3 1 2', '2 3 1', '-1 -1 -2']
                + [' '.join(str(ri(r, -10**5, 10**5)) for _ in range(3)) for _ in range(8)])

# ---------------------------------------------------------------- L
_names = ['ahmed', 'ali', 'omar', 'sara', 'mona', 'hassan', 'nour', 'kareem', 'laila', 'youssef', 'salma', 'tarek']
_last = ['ramadan', 'salah', 'kamel', 'hussein', 'fathy', 'saad', 'gamal', 'nabil', 'adel', 'shawky']
P(letter='L', name='the-brothers', title='The Brothers', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='Each person has a first name and a second name. Two people are brothers if they have the same second name. '
         'Given two people, decide whether they are brothers.',
  input='The first line contains two words $F_1$ and $S_1$, the first and second name of the first person. '
        'The second line contains $F_2$ and $S_2$ for the second person. Every name consists of 1 to 20 lowercase English letters.',
  output='Print "ARE Brothers" if they are brothers, otherwise print "NOT".',
  samples=[('bassam ramadan\nahmed ramadan', 'ARE Brothers'), ('ali salah\nayman salah', 'ARE Brothers'), ('ali kamel\nali salah', 'NOT')],
  solution=CPP + 'int main(){ string f1,s1,f2,s2; cin>>f1>>s1>>f2>>s2; cout<<(s1==s2?"ARE Brothers":"NOT")<<"\\n"; }\n',
  wrong={'wrong-first-name.cpp': CPP + 'int main(){ string f1,s1,f2,s2; cin>>f1>>s1>>f2>>s2; cout<<(f1==f2?"ARE Brothers":"NOT")<<"\\n"; }\n'},
  gen=lambda r: ['a a\na a', 'a b\nb a', 'ali salah\nali salah', 'ali salahx\nomar salah', 'x ' + 'z' * 20 + '\ny ' + 'z' * 20,
                 'ab abc\nab ab']
                + [f'{r.choice(_names)} {s}\n{r.choice(_names)} {s if r.random() < .5 else r.choice(_last)}'
                   for s in (r.choice(_last) for _ in range(8))])

# ---------------------------------------------------------------- M
P(letter='M', name='capital-small-digit', title='Capital or Small or Digit', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given one character $X$: a digit, an uppercase letter or a lowercase letter. '
         'Say whether it is a digit or a letter, and for a letter whether it is uppercase or lowercase. '
         'In ASCII, the digits \'0\'..\'9\' are 48..57, uppercase \'A\'..\'Z\' are 65..90 and lowercase \'a\'..\'z\' are 97..122.',
  input='One line with a single character $X$ (a digit or an English letter).',
  output='If $X$ is a digit, print "IS DIGIT". Otherwise print "ALPHA" on the first line, and on the second line '
         '"IS CAPITAL" for an uppercase letter or "IS SMALL" for a lowercase letter.',
  samples=[('A', 'ALPHA\nIS CAPITAL'), ('9', 'IS DIGIT'), ('a', 'ALPHA\nIS SMALL')],
  solution=CPP + 'int main(){ char c; cin>>c; if(c>=\'0\'&&c<=\'9\') cout<<"IS DIGIT\\n"; '
                 'else cout<<"ALPHA\\n"<<(c>=\'A\'&&c<=\'Z\'?"IS CAPITAL":"IS SMALL")<<"\\n"; }\n',
  gen=lambda r: list('0Zz5mQ') + [r.choice('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') for _ in range(8)])

# ---------------------------------------------------------------- N
P(letter='N', name='char', title='Char', tl=1000, ml=64, checker='std::wcmp.cpp',
  legend='You are given a letter $X$. If it is lowercase, print it in uppercase; if it is uppercase, print it in lowercase. '
         'In ASCII the difference between \'a\' and \'A\' is 32.',
  input='One line with a single English letter $X$.',
  output='Print the letter with its case changed.',
  samples=[('a', 'A'), ('A', 'a')],
  solution=CPP + 'int main(){ char c; cin>>c; if(c>=\'a\'&&c<=\'z\') c=c-32; else c=c+32; cout<<c<<"\\n"; }\n',
  gen=lambda r: list('zZmM') + [r.choice('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') for _ in range(8)])

# ---------------------------------------------------------------- O
P(letter='O', name='calculator', title='Calculator', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given an expression of the form $A$+$B$, $A$-$B$, $A$*$B$ or $A$/$B$ written without spaces. '
         'Print its value. For division, print only the integer part of the result.',
  input='One line with the expression: an integer $A$, a sign $S$ (one of +, -, *, /) and an integer $B$, '
        'with no spaces between them ($1 \\le A, B \\le 10^4$).',
  output='Print the value of the expression.',
  samples=[('7+54', '61'), ('17*10', '170')],
  solution=CPP + 'int main(){ long long a,b; char s; cin>>a>>s>>b; if(s==\'+\') cout<<a+b; else if(s==\'-\') cout<<a-b; '
                 'else if(s==\'*\') cout<<a*b; else cout<<a/b; cout<<"\\n"; }\n',
  gen=lambda r: ['10000*10000', '1-10000', '10000/1', '1/10000', '9999/100', '10000+10000', '5-5', '7/2']
                + [f'{ri(r, 1, 10**4)}{r.choice("+-*/")}{ri(r, 1, 10**4)}' for _ in range(10)])

# ---------------------------------------------------------------- P
P(letter='P', name='first-digit', title='First digit !', tl=1000, ml=64, checker='std::wcmp.cpp',
  legend='You are given a four-digit number $X$. Print "EVEN" if its first (leftmost) digit is even, otherwise print "ODD". '
         'For example, the first digit of 4569 is 4.',
  input='One line with an integer $X$ ($999 < X \\le 9999$).',
  output='Print "EVEN" or "ODD".',
  samples=[('4569', 'EVEN'), ('3569', 'ODD')],
  solution=CPP + 'int main(){ int x; cin>>x; cout<<((x/1000)%2==0?"EVEN":"ODD")<<"\\n"; }\n',
  wrong={'wrong-last-digit.cpp': CPP + 'int main(){ int x; cin>>x; cout<<(x%2==0?"EVEN":"ODD")<<"\\n"; }\n'},
  gen=lambda r: ['1000', '9999', '2000', '8999', '1998', '4561', '7000'] + [str(ri(r, 1000, 9999)) for _ in range(8)])

# ---------------------------------------------------------------- Q
P(letter='Q', name='point-coordinates', title='Coordinates of a Point', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given the coordinates $X$ and $Y$ of a point in the plane. Say where it lies:'
         '\\begin{itemize}\\item "Q1", "Q2", "Q3" or "Q4" for the quadrant it is in;'
         '\\item "Origem" if it is the origin;'
         '\\item "Eixo X" if it lies on the X axis (but is not the origin);'
         '\\item "Eixo Y" if it lies on the Y axis (but is not the origin).\\end{itemize}',
  input='One line with two real numbers $X$ and $Y$, each with one digit after the decimal point ($-1000 \\le X, Y \\le 1000$).',
  output='Print the answer.',
  samples=[('4.5 -2.2', 'Q4'), ('0.1 0.1', 'Q1')],
  solution=CPP + 'int main(){ double x,y; cin>>x>>y; if(x==0&&y==0) cout<<"Origem"; else if(y==0) cout<<"Eixo X"; '
                 'else if(x==0) cout<<"Eixo Y"; else if(x>0&&y>0) cout<<"Q1"; else if(x<0&&y>0) cout<<"Q2"; '
                 'else if(x<0) cout<<"Q3"; else cout<<"Q4"; cout<<"\\n"; }\n',
  gen=lambda r: ['0.0 0.0', '5.0 0.0', '-5.0 0.0', '0.0 7.5', '0.0 -7.5', '-1.5 2.5', '-1.5 -2.5', '1000.0 -1000.0', '-0.1 0.1']
                + [f'{real(r, -1000, 1000, 1)} {real(r, -1000, 1000, 1)}' for _ in range(8)])

# ---------------------------------------------------------------- R
P(letter='R', name='age-in-days', title='Age in Days', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given a person\'s age $N$ in days. Write it as years, months and days, assuming every year has 365 days '
         'and every month has 30 days.',
  input='One line with an integer $N$ ($0 \\le N \\le 10^6$).',
  output='Print three lines: "$Y$ years", "$M$ months" and "$D$ days".',
  samples=[('400', '1 years\n1 months\n5 days'), ('800', '2 years\n2 months\n10 days'), ('30', '0 years\n1 months\n0 days')],
  solution=CPP + 'int main(){ int n; cin>>n; cout<<n/365<<" years\\n"<<n%365/30<<" months\\n"<<n%365%30<<" days\\n"; }\n',
  gen=lambda r: ['0', '1000000', '364', '365', '366', '29', '395', '729', '730'] + [str(ri(r, 0, 10**6)) for _ in range(6)])

# ---------------------------------------------------------------- S
P(letter='S', name='interval', title='Interval', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given a number $X$. Find which of the intervals $[0,25]$, $(25,50]$, $(50,75]$, $(75,100]$ contains it. '
         'A square bracket includes the end point, a round bracket excludes it.',
  input='One line with a real number $X$ ($-1000 \\le X \\le 1000$).',
  output='Print "Interval " followed by the interval exactly as written above (for example "Interval (25,50]"), '
         'or "Out of Intervals" if $X$ is in none of them.',
  samples=[('25.1', 'Interval (25,50]'), ('25.0', 'Interval [0,25]'), ('100.0', 'Interval (75,100]'), ('-25.2', 'Out of Intervals')],
  solution=CPP + 'int main(){ double x; cin>>x; if(x<0||x>100) cout<<"Out of Intervals"; else if(x<=25) cout<<"Interval [0,25]"; '
                 'else if(x<=50) cout<<"Interval (25,50]"; else if(x<=75) cout<<"Interval (50,75]"; else cout<<"Interval (75,100]"; cout<<"\\n"; }\n',
  gen=lambda r: ['0.0', '0', '50.0', '50.0001', '75.0', '75.0001', '100.0001', '-0.0001', '1000', '-1000', '25.00001']
                + [real(r, -150, 250, ri(r, 1, 4)) for _ in range(8)])

# ---------------------------------------------------------------- T
P(letter='T', name='sort-numbers', title='Sort Numbers', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given three numbers $A$, $B$, $C$. Print them in ascending order, then an empty line, '
         'then the three numbers again in the order they were given.',
  input='One line with three integers $A$, $B$, $C$ ($-10^6 \\le A, B, C \\le 10^6$).',
  output='Print the three numbers in ascending order, one per line, then an empty line, then the original three numbers, one per line.',
  samples=[('3 -2 1', '-2\n1\n3\n\n3\n-2\n1'), ('-2 10 0', '-2\n0\n10\n\n-2\n10\n0')],
  solution=CPP + 'int main(){ long long a[3]; for(auto&x:a) cin>>x; long long s[3]={a[0],a[1],a[2]}; sort(s,s+3); '
                 'for(auto x:s) cout<<x<<"\\n"; cout<<"\\n"; for(auto x:a) cout<<x<<"\\n"; }\n',
  gen=lambda r: ['1 1 1', '1000000 -1000000 0', '3 2 1', '1 2 3', '2 2 1', '-5 -5 -6']
                + [' '.join(str(ri(r, -10**6, 10**6)) for _ in range(3)) for _ in range(8)])

# ---------------------------------------------------------------- U
P(letter='U', name='float-or-int', title='Float or int', tl=1000, ml=256, checker=TOK4,
  legend='You are given a number $N$ written with three digits after the decimal point. If its fractional part is zero, '
         'print "int" and its integer part. Otherwise print "float", its integer part and its fractional part.',
  input='One line with a real number $N$ with exactly three digits after the decimal point ($1 \\le N \\le 10^3$).',
  output='Print "int $I$" if $N$ is a whole number, otherwise "float $I$ $F$", where $I$ is the integer part and $F$ the fractional part.',
  notes='See the examples for the exact format.',
  samples=[('234.000', 'int 234'), ('534.958', 'float 534 0.958')],
  solution=CPP + 'int main(){ double n; cin>>n; long long i=(long long)n; double f=n-i; if(f<1e-9) cout<<"int "<<i; '
                 'else cout<<"float "<<i<<" "<<f; cout<<"\\n"; }\n',
  gen=lambda r: ['1.000', '1000.000', '1.001', '999.999', '500.500', '12.010', '7.100', '100.000']
                + [f'{ri(r, 1, 999)}.{ri(r, 0, 999):03d}' for _ in range(8)])

# ---------------------------------------------------------------- V
P(letter='V', name='comparison', title='Comparison', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given a comparison "$A$ $S$ $B$" where $S$ is one of \\texttt{<}, \\texttt{>} or \\texttt{=}. '
         'Print "Right" if it is true and "Wrong" otherwise.',
  input='One line with an integer $A$, the sign $S$ and an integer $B$, separated by spaces ($-100 \\le A, B \\le 100$).',
  output='Print "Right" or "Wrong".',
  samples=[('5 > 4', 'Right'), ('9 < 1', 'Wrong'), ('4 = 4', 'Right')],
  solution=CPP + 'int main(){ int a,b; char s; cin>>a>>s>>b; bool ok = s==\'<\' ? a<b : s==\'>\' ? a>b : a==b; cout<<(ok?"Right":"Wrong")<<"\\n"; }\n',
  gen=lambda r: ['-100 < 100', '100 > -100', '-100 = -100', '5 < 5', '5 > 5', '5 = 6', '-1 < -2', '0 = 0']
                + [f'{ri(r, -100, 100)} {r.choice("<>=")} {ri(r, -100, 100)}' for _ in range(10)])

# ---------------------------------------------------------------- W
P(letter='W', name='math-expression', title='Mathematical Expression', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given an equation "$A$ $S$ $B$ = $C$" where $S$ is +, - or *. '
         'Print "Yes" if the equation is correct; otherwise print the correct value of $A$ $S$ $B$.',
  input='One line with $A$, $S$, $B$, the sign "=" and $C$, separated by spaces ($0 \\le A, B \\le 100$, $-10^5 \\le C \\le 10^5$).',
  output='Print "Yes", or the correct value of $A$ $S$ $B$.',
  samples=[('5 + 10 = 15', 'Yes'), ('3 - 1 = 2', 'Yes'), ('2 * 10 = 19', '20')],
  solution=CPP + 'int main(){ long long a,b,c; char s,q; cin>>a>>s>>b>>q>>c; long long v = s==\'+\' ? a+b : s==\'-\' ? a-b : a*b; '
                 'if(v==c) cout<<"Yes"; else cout<<v; cout<<"\\n"; }\n',
  gen=lambda r: ['100 * 100 = 10000', '100 * 100 = 9999', '0 - 100 = -100', '0 - 100 = 100', '0 + 0 = 0', '0 * 50 = 1', '7 - 9 = -2']
                + [(lambda a, s, b: f'{a} {s} {b} = {eval(f"{a}{s}{b}") if r.random() < .4 else ri(r, -10**5, 10**5)}')(
                    ri(r, 0, 100), r.choice('+-*'), ri(r, 0, 100)) for _ in range(10)])

# ---------------------------------------------------------------- X
def _gen_x(r):
    out = ['1 15 5 27', '2 5 6 12', '1 1 1 1', '1 1000000000 1 1000000000', '5 10 10 20', '10 20 5 10', '1 2 3 4',
           '1 100 20 30', '20 30 1 100', '1000000000 1000000000 1 999999999']
    for _ in range(8):
        a, b = sorted(ri(r, 1, 10**9) for _ in range(2))
        c, d = sorted(ri(r, 1, 10**9) for _ in range(2))
        out.append(f'{a} {b} {c} {d}')
    return out


P(letter='X', name='two-intervals', title='Two intervals', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given two intervals $[l_1, r_1]$ and $[l_2, r_2]$. Print the end points of their intersection.',
  input='One line with four integers $l_1$, $r_1$, $l_2$, $r_2$ ($1 \\le l_1, r_1, l_2, r_2 \\le 10^9$, $l_1 \\le r_1$, $l_2 \\le r_2$).',
  output='If the intervals intersect, print the left and right end of the intersection separated by a space. Otherwise print -1.',
  samples=[('1 15 5 27', '5 15'), ('2 5 6 12', '-1')],
  solution=CPP + 'int main(){ long long a,b,c,d; cin>>a>>b>>c>>d; long long l=max(a,c), h=min(b,d); if(l<=h) cout<<l<<" "<<h; else cout<<-1; cout<<"\\n"; }\n',
  gen=_gen_x)

# ---------------------------------------------------------------- Y
P(letter='Y', name='last-two-digits', title='The last 2 digits', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given four numbers $A$, $B$, $C$ and $D$. Print the last two digits of their product $A \\cdot B \\cdot C \\cdot D$.',
  input='One line with four integers $A$, $B$, $C$, $D$ ($2 \\le A, B, C, D \\le 10^9$).',
  output='Print the last two digits of the product, always as two digits (for example 05).',
  notes='$5 \\cdot 7 \\cdot 2 \\cdot 4 = 280$, so the first answer is 80. $3 \\cdot 9 \\cdot 9 \\cdot 9 = 2187$, so the second is 87.',
  samples=[('5 7 2 4', '80'), ('3 9 9 9', '87')],
  solution=CPP + 'int main(){ long long a,b,c,d; cin>>a>>b>>c>>d; long long x=(a%100)*(b%100)%100*(c%100)%100*(d%100)%100; '
                 'if(x<10) cout<<0; cout<<x<<"\\n"; }\n',
  wrong={'wrong-overflow.cpp': CPP + 'int main(){ long long a,b,c,d; cin>>a>>b>>c>>d; long long x=a*b*c*d%100; if(x<10) cout<<0; cout<<x<<"\\n"; }\n'},
  gen=lambda r: ['1000000000 1000000000 1000000000 1000000000', '999999999 999999999 999999999 999999999', 
                 '101 101 101 101', '5 5 4 2', '2 2 2 2', '25 4 3 7', '999999937 999999929 999999893 999999883']
                + [' '.join(str(ri(r, 2, 10**9)) for _ in range(4)) for _ in range(8)])

# ---------------------------------------------------------------- Z
_Z = CPP + r'''
// Smallest base r with x = r^k; returns {r, k}.
pair<long long,long long> root(long long x){
    for(long long k=40;k>=2;k--){
        long long r=llround(pow((double)x,1.0/k));
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
        __int128 ea=(__int128)ka*b, ec=(__int128)kc*d;
        cout<<(ea>ec?"YES":"NO")<<"\n"; return 0;
    }
    long double l=(long double)b*logl((long double)a), r=(long double)d*logl((long double)c);
    cout<<(l>r?"YES":"NO")<<"\n";
}
'''
P(letter='Z', name='hard-compare', title='Hard Compare', tl=1000, ml=256, checker='std::wcmp.cpp',
  legend='You are given four numbers $A$, $B$, $C$ and $D$. Print "YES" if $A^B > C^D$, otherwise print "NO".',
  input='One line with four integers $A$, $B$, $C$, $D$ ($1 \\le A, C \\le 10^7$, $1 \\le B, D \\le 10^{12}$).',
  output='Print "YES" or "NO".',
  notes='$3^2 = 9 < 5^4 = 625$, so the first answer is NO. $5^2 = 25 > 4^2 = 16$, so the second is YES. '
        'In the third example both sides equal 25, so the answer is NO. The numbers can be far too large to compute directly.',
  samples=[('3 2 5 4', 'NO'), ('5 2 4 2', 'YES'), ('5 2 5 2', 'NO')],
  solution=_Z,
  gen=lambda r: ['2 4 4 2', '4 2 2 4', '2 5 4 2', '8 4 16 3', '16 3 8 4', '1 1000000000000 2 1', '2 1 1 1000000000000',
                 '1 5 1 7', '10000000 1000000000000 10000000 1000000000000', '9999991 1000000000000 9999973 1000000000000',
                 '1000 333333333333 10 999999999999',
                 '3 630929753572 2 1000000000000']
                + [f'{ri(r, 1, 10**7)} {ri(r, 1, 10**12)} {ri(r, 1, 10**7)} {ri(r, 1, 10**12)}' for _ in range(6)])
