import { Timer, TrendingUp, Info, Zap, BarChart3 } from 'lucide-react';

export default function Session7Content() {
    return (
        <div className="space-y-12 text-white/90">
            {/* Section 1: What is Complexity? */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <Timer className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">What is Complexity?</h2>
                </div>
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">Why Do We Care?</h3>
                    <p className="text-white/70 mb-4 leading-relaxed">
                        In competitive programming, getting the <strong className="text-white">correct answer</strong> is not enough — your solution must also run <strong className="text-white">fast enough</strong>. Complexity analysis is how we predict whether our code will pass within the time limit before we even submit it.
                    </p>
                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
                        <h4 className="text-blue-400 font-bold mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Info className="w-4 h-4" /> Rule of Thumb
                        </h4>
                        <p className="text-sm text-white/80">
                            A modern computer can execute roughly <code className="text-[#d59928] bg-white/5 px-1.5 py-0.5 rounded font-mono">10⁸</code> simple operations per second. If the time limit is 1 second and <code className="text-[#d59928] bg-white/5 px-1.5 py-0.5 rounded font-mono">n ≤ 10⁵</code>, an O(n²) solution does 10¹⁰ operations — <strong className="text-red-400">too slow</strong>. An O(n log n) solution does ~1.7 × 10⁶ — <strong className="text-green-400">fast enough</strong>.
                        </p>
                    </div>
                </div>
            </section>

            {/* Section 2: Big-O Notation */}
            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <TrendingUp className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Big-O Notation</h2>
                </div>
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <p className="text-white/70 mb-6 leading-relaxed">
                        Big-O describes the <strong className="text-white">upper bound</strong> of how an algorithm's runtime grows relative to its input size <code className="text-[#d59928] bg-white/5 px-1.5 py-0.5 rounded font-mono">n</code>. We always focus on the <strong className="text-white">dominant term</strong> and drop constants.
                    </p>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 mb-6 overflow-x-auto">
                        <pre className="text-green-400">{`// O(1) — Constant: doesn't depend on n
int x = arr[0];

// O(n) — Linear: one loop over n
for (int i = 0; i < n; i++) { ... }

// O(n²) — Quadratic: nested loops
for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++) { ... }

// O(log n) — Logarithmic: halving each step
while (n > 0) { n /= 2; }

// O(n log n) — Linearithmic: e.g. sorting
sort(arr, arr + n);`}</pre>
                    </div>
                </div>
            </section>

            {/* Section 3: Common Complexities */}
            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <BarChart3 className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Common Complexities Ranked</h2>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="px-4 py-3 font-bold text-white">Complexity</th>
                                <th className="px-4 py-3 font-bold text-white">Name</th>
                                <th className="px-4 py-3 font-bold text-white">n = 10⁶</th>
                                <th className="px-4 py-3 font-bold text-white">Verdict</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {[
                                { big: 'O(1)', name: 'Constant', ops: '1', ok: true },
                                { big: 'O(log n)', name: 'Logarithmic', ops: '~20', ok: true },
                                { big: 'O(√n)', name: 'Square Root', ops: '~1000', ok: true },
                                { big: 'O(n)', name: 'Linear', ops: '10⁶', ok: true },
                                { big: 'O(n log n)', name: 'Linearithmic', ops: '~2 × 10⁷', ok: true },
                                { big: 'O(n²)', name: 'Quadratic', ops: '10¹²', ok: false },
                                { big: 'O(2ⁿ)', name: 'Exponential', ops: '🤯', ok: false },
                            ].map((row) => (
                                <tr key={row.big} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-3 font-mono text-[#d59928]">{row.big}</td>
                                    <td className="px-4 py-3 text-white/70">{row.name}</td>
                                    <td className="px-4 py-3 text-white/70 font-mono">{row.ops}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.ok ? 'bg-green-900/30 text-green-400 border border-green-500/20' : 'bg-red-900/30 text-red-400 border border-red-500/20'}`}>
                                            {row.ok ? '✓ Fast' : '✗ TLE'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Section 4: Estimating from Constraints */}
            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <Zap className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Estimating from Constraints</h2>
                </div>
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <p className="text-white/70 mb-4 leading-relaxed">
                        Before writing code, check the constraint on <code className="text-[#d59928] bg-white/5 px-1.5 py-0.5 rounded font-mono">n</code> in the problem. This tells you the maximum complexity your solution can have:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { range: 'n ≤ 10', target: 'O(n!) or O(2ⁿ)' },
                            { range: 'n ≤ 20', target: 'O(2ⁿ)' },
                            { range: 'n ≤ 500', target: 'O(n³)' },
                            { range: 'n ≤ 5000', target: 'O(n²)' },
                            { range: 'n ≤ 10⁶', target: 'O(n log n)' },
                            { range: 'n ≤ 10⁸', target: 'O(n)' },
                        ].map((item) => (
                            <div key={item.range} className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                                <span className="text-white/80 font-mono text-sm">{item.range}</span>
                                <span className="text-[#d59928] font-mono text-sm font-bold">{item.target}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">Counting Operations — Example</h3>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 mb-4 overflow-x-auto">
                        <pre className="text-green-400">{`// What is the complexity of this?
int count = 0;
for (int i = 0; i < n; i++)          // runs n times
    for (int j = i; j < n; j++)      // runs n-i times
        count++;

// Total = n + (n-1) + (n-2) + ... + 1
//       = n(n+1)/2
//       = O(n²)  ← drop constants & lower terms`}</pre>
                    </div>
                    <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-4">
                        <h4 className="text-yellow-400 font-bold mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Info className="w-4 h-4" /> Common Mistake
                        </h4>
                        <p className="text-sm text-white/80">
                            Don't confuse <code className="font-mono bg-black/30 px-1 rounded">j = i</code> with <code className="font-mono bg-black/30 px-1 rounded">j = 0</code> — the inner loop starting at <code className="font-mono bg-black/30 px-1 rounded">i</code> still gives O(n²), just with half the operations. Big-O ignores constant factors.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
