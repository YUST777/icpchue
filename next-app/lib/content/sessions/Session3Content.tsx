import { Terminal, AlertTriangle } from 'lucide-react';

export default function Session3Content() {
    return (
        <div className="space-y-12 text-white/90">
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <Terminal className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Control Flow</h2>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">if/else Statements</h3>
                    <p className="text-white/70 mb-4">Master conditional statements, logical operators, and control flow patterns.</p>
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-black/30 p-4 rounded-lg">
                            <h4 className="text-sm font-bold text-white mb-2">Comparison Operators</h4>
                            <ul className="text-xs text-white/60 space-y-1 font-mono">
                                <li>a &lt; b : Less than</li>
                                <li>a &gt; b : Greater than</li>
                                <li>a == b : Equal to</li>
                                <li>a != b : Not equal to</li>
                            </ul>
                        </div>
                        <div className="bg-black/30 p-4 rounded-lg">
                            <h4 className="text-sm font-bold text-white mb-2">Ternary Operator</h4>
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{`variable = (condition) ? true : false;`}</pre>
                        </div>
                    </div>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">Switch Statement</h3>
                    <div className="prose prose-invert max-w-none text-white/80 text-sm">
                        <p>Switch is a control structure that chooses one code path based on an integer-like value. When cases are dense numbers (1,2,3...), the compiler builds a jump table for instant <strong>O(1)</strong> lookup.</p>
                    </div>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 overflow-x-auto mt-4">
                        <pre className="text-green-400">{`switch (age) {
    case 0 ... 4:   // GCC extension
        cout << "Free";
        break;
    default:
        cout << "Paid";
}`}</pre>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-yellow-500 bg-yellow-900/10 p-2 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Range syntax (0 ... 4) is a GCC extension.</span>
                    </div>
                </div>
            </section>
        </div>
    );
}
