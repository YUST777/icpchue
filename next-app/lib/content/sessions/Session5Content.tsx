import { Terminal, AlertTriangle, Info } from 'lucide-react';
import { X, Check } from 'lucide-react';

export default function Session5Content() {
    return (
        <div className="space-y-12 text-white/90">
            {/* Introduction to Algorithms and Complexity */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <Terminal className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Introduction to Algorithms</h2>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">Basic Concepts</h3>
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-black/30 p-4 rounded-lg">
                            <h4 className="text-sm font-bold text-white mb-2">What is a Program?</h4>
                            <p className="text-sm text-white/70">A program is a sequence of instructions executed by the computer.</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-lg">
                            <h4 className="text-sm font-bold text-white mb-2">What is an Instruction?</h4>
                            <p className="text-sm text-white/70">An instruction is one action the computer performs while running a program.</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h4 className="text-sm font-bold text-white mb-3">Examples of Instructions:</h4>
                        <div className="space-y-3 font-mono text-sm">
                            <div className="bg-black/50 p-3 rounded border border-white/5">
                                <p className="text-gray-400 mb-1">{'// Assignment'}</p>
                                <pre className="text-green-400">int x = 5;</pre>
                                <pre className="text-green-400">x = x + 1;</pre>
                            </div>
                            <div className="bg-black/50 p-3 rounded border border-white/5">
                                <p className="text-gray-400 mb-1">{'// Comparison'}</p>
                                <pre className="text-green-400">if (x {'>'} 10)</pre>
                            </div>
                            <div className="bg-black/50 p-3 rounded border border-white/5">
                                <p className="text-gray-400 mb-1">{'// Output'}</p>
                                <pre className="text-green-400">cout {'<<'} x;</pre>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">Algorithms</h3>
                    <div className="mb-4">
                        <p className="text-lg text-white mb-2"><strong className="text-[#d59928]">What is an Algorithm?</strong></p>
                        <p className="text-white/70">An Algorithm is a sequence of <strong>well-defined instructions</strong> for solving a problem.</p>
                    </div>
                    <div>
                        <p className="text-lg text-white mb-2"><strong className="text-[#d59928]">Why Study Algorithms?</strong></p>
                        <ul className="list-disc list-inside text-white/70 space-y-1 ml-2">
                            <li>To know a standard set of important algorithms from different areas of computing.</li>
                            <li>To be able to design new algorithms and analyze their efficiency.</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Time Complexity */}
            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <AlertTriangle className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Time Complexity Analysis</h2>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">What is Time Complexity?</h3>
                    <p className="text-white/70 mb-6">Time Complexity describes how many times program instructions are executed as the input size increases.</p>

                    <div className="bg-yellow-900/10 border border-yellow-500/20 p-4 rounded-xl mb-6">
                        <h4 className="text-yellow-500 font-bold mb-2 flex items-center gap-2">
                            <Info className="w-4 h-4" /> Important Clarification
                        </h4>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2 text-red-400"><X size={16} /> It is not the real time in seconds.</li>
                            <li className="flex items-center gap-2 text-red-400"><X size={16} /> It does not depend on computer speed.</li>
                            <li className="flex items-center gap-2 text-green-400"><Check size={16} /> It depends on the number of executed instructions.</li>
                        </ul>
                    </div>

                    <h4 className="text-lg font-bold text-white mb-3">Why Do We Need Time Complexity?</h4>
                    <ol className="list-decimal list-inside text-white/70 space-y-1 ml-2 mb-4">
                        <li>To compare different solutions.</li>
                        <li>To know which program works better for large inputs.</li>
                        <li>To avoid very slow programs.</li>
                    </ol>
                    <p className="italic text-white/50 text-sm border-l-2 border-white/20 pl-3">Note: Time complexity depends on how many times instructions are executed.</p>
                </div>
            </section>

            {/* Complexity Examples */}
            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <Terminal className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Complexity Examples</h2>
                </div>

                {/* Example 1: O(n) */}
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white">1. Linear Time: <span className="text-green-400 font-mono">O(n)</span></h3>
                    </div>
                    <p className="text-white/70 mb-4"><strong>Problem:</strong> Find the sum of numbers from 1 to <span className="font-mono">n</span>.</p>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 overflow-x-auto mb-4">
                        <pre className="text-blue-400">{`int sum = 0;
for (int i = 1; i <= n; i++) {
    sum = sum + i;
}`}</pre>
                    </div>
                    <div className="space-y-2 text-sm text-white/60 mb-4">
                        <p><strong>Counting Instructions:</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                            <li><code className="text-[#d59928]">sum = 0</code> → executed <strong>1 time</strong></li>
                            <li>Loop runs → <strong>n times</strong></li>
                            <li><code className="text-[#d59928]">sum = sum + i</code> → executed <strong>n times</strong></li>
                        </ul>
                        <p className="mt-2 text-white/80 italic">The number of instructions increases linearly with n.</p>
                    </div>
                </div>

                {/* Example 2: O(1) */}
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white">2. Constant Time: <span className="text-green-400 font-mono">O(1)</span></h3>
                    </div>
                    <p className="text-white/70 mb-4"><strong>Problem:</strong> Sum from 1 to <span className="font-mono">n</span> (Efficient Solution).</p>
                    <p className="text-white/60 text-sm mb-4">Instead of adding numbers one by one, we use a mathematical formula.</p>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 overflow-x-auto mb-4">
                        <pre className="text-blue-400">{`int sum = n * (n + 1) / 2;`}</pre>
                    </div>
                    <div className="space-y-2 text-sm text-white/60 mb-4">
                        <p><strong>Counting Instructions:</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                            <li>Multiplication, Addition, Division, Assignment → Each <strong>1 time</strong></li>
                        </ul>
                        <p className="mt-2 text-white/80 italic">Total instructions = constant.</p>
                    </div>
                </div>

                {/* Example 3: O(n^2) */}
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white">3. Quadratic Time: <span className="text-green-400 font-mono">O(n²)</span></h3>
                    </div>
                    <p className="text-white/70 mb-4"><strong>Problem:</strong> Nested Loops.</p>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 overflow-x-auto mb-4">
                        <pre className="text-blue-400">{`for (int i = 1; i <= n; i++) {
    for (int j = 1; j <= n; j++) {
        cout << "Hello";
    }
}`}</pre>
                    </div>
                    <div className="space-y-2 text-sm text-white/60 mb-4">
                        <p><strong>Counting Instructions:</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                            <li>Outer loop runs → <strong>n times</strong></li>
                            <li>Inner loop runs → <strong>n times</strong> for each iteration of outer loop</li>
                            <li>Total inner body executions → <strong>n × n = n²</strong></li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}
