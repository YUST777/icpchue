import { Terminal } from 'lucide-react';

export default function Session4Content() {
    return (
        <div className="space-y-12 text-white/90">
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <Terminal className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Revision Session</h2>
                </div>
                <div className="mb-8">
                    <p className="text-white/70 text-lg">This session covers a comprehensive review of all topics from the previous sessions. Complete the 3 practice problems below to test your understanding.</p>
                </div>

                {/* Practice Problems */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white border-l-4 border-[#d59928] pl-3">Practice Problems</h3>

                    {/* Problem 1 */}
                    <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-[#d59928] text-black px-2.5 py-1 rounded-full text-xs font-bold">Problem 1</span>
                            <span className="text-white/40 text-sm">I/O & Data Types</span>
                        </div>
                        <h4 className="text-lg font-bold mb-3 text-white">Sum of Two Numbers</h4>
                        <p className="text-white/70 mb-4">Read two integers from the user and print their sum. Make sure to handle the case where the sum might overflow.</p>
                        <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 overflow-x-auto">
                            <pre className="text-green-400">{`// Sample Input:
5 7
// Sample Output:
12`}</pre>
                        </div>
                    </div>

                    {/* Problem 2 */}
                    <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-[#d59928] text-black px-2.5 py-1 rounded-full text-xs font-bold">Problem 2</span>
                            <span className="text-white/40 text-sm">Control Flow</span>
                        </div>
                        <h4 className="text-lg font-bold mb-3 text-white">Grade Calculator</h4>
                        <p className="text-white/70 mb-4">Given a score (0-100), print the corresponding grade: A (90-100), B (80-89), C (70-79), D (60-69), F (below 60).</p>
                        <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 overflow-x-auto">
                            <pre className="text-green-400">{`// Sample Input:
85
// Sample Output:
B`}</pre>
                        </div>
                    </div>

                    {/* Problem 3 */}
                    <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-[#d59928] text-black px-2.5 py-1 rounded-full text-xs font-bold">Problem 3</span>
                            <span className="text-white/40 text-sm">Loops</span>
                        </div>
                        <h4 className="text-lg font-bold mb-3 text-white">Factorial</h4>
                        <p className="text-white/70 mb-4">Given a non-negative integer n, print n! (n factorial). Remember: 0! = 1.</p>
                        <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 overflow-x-auto">
                            <pre className="text-green-400">{`// Sample Input:
5
// Sample Output:
120`}</pre>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
