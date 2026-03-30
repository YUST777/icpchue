import { Terminal, Info, AlertTriangle, FileText } from 'lucide-react';

export default function Session1Content() {
    return (
        <div className="space-y-12 text-white/90">
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <Terminal className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Standard I/O: iostream</h2>
                </div>
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">Console Output (cout)</h3>
                    <p className="text-white/70 mb-4 leading-relaxed">
                        The <code className="text-[#d59928] bg-white/5 px-1.5 py-0.5 rounded font-mono">cout</code> object is used for outputting data to the standard output device (usually your screen). It is buffered and type-safe.
                    </p>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 mb-6 overflow-x-auto">
                        <pre className="text-green-400">{`// Example of formatting with iomanip
cout << right << setw(5) << 122;
cout << setw(5) << 78 << '\\n';

// Basic Types
int num = 10;
string str = "Hello, CPP!";
cout << "Result: " << num << " - " << str << endl;`}</pre>
                    </div>
                </div>
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">Console Input (cin)</h3>
                    <p className="text-white/70 mb-4">Used for getting input from the user. Note that <code className="text-[#d59928]">cin</code> stops reading at whitespace (space, tab, newline).</p>
                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4 mb-6">
                        <h4 className="text-blue-400 font-bold mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Info className="w-4 h-4" /> Pro Tip: getline()
                        </h4>
                        <p className="text-sm text-white/80 mb-2">To read a full line of text including spaces, use <code className="font-mono bg-black/30 px-1 rounded">getline(cin, str)</code>.</p>
                        <div className="bg-black/30 p-2 rounded text-xs font-mono text-white/70">
                            <pre>{`string str;
// Reads until space
cin >> str; 

// Reads whole line until enter
getline(cin, str);

// Reads until custom delimiter ('.')
getline(cin, str, '.');`}</pre>
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <AlertTriangle className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Error & Logging</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-[#1a1a1a] p-5 rounded-xl border border-white/5">
                        <h4 className="font-bold text-red-400 mb-2">cerr (Unbuffered)</h4>
                        <p className="text-sm text-white/60">Outputs immediately. Best for critical errors.</p>
                    </div>
                    <div className="bg-[#1a1a1a] p-5 rounded-xl border border-white/5">
                        <h4 className="font-bold text-yellow-400 mb-2">clog (Buffered)</h4>
                        <p className="text-sm text-white/60">Stores in buffer first. Best for non-critical logging.</p>
                    </div>
                </div>
            </section>

            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <FileText className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Data Types & Limits</h2>
                </div>
                <p className="text-white/70">Understanding the limits of data types is crucial in Competitive Programming to avoid Overflow and Underflow.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    {['int', 'double', 'float', 'char', 'bool', 'long long', 'short', 'unsigned int'].map(type => (
                        <div key={type} className="bg-[#1a1a1a] p-3 rounded-lg border border-white/5 font-mono text-sm text-[#d59928]">{type}</div>
                    ))}
                </div>
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
                    <h3 className="text-lg font-bold mb-3 text-white">How to check limits?</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <span className="text-xs text-white/40 uppercase font-bold block mb-2">Modern C++ (limits)</span>
                            <pre className="bg-black/50 p-3 rounded-lg text-xs font-mono text-green-400">{`#include <limits>
cout << numeric_limits<int>::max();`}</pre>
                        </div>
                        <div>
                            <span className="text-xs text-white/40 uppercase font-bold block mb-2">Simpler (climits)</span>
                            <pre className="bg-black/50 p-3 rounded-lg text-xs font-mono text-green-400">{`#include <climits>
cout << INT_MAX;`}</pre>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
