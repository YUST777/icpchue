import { Terminal, Lightbulb, Box, Code, AlertTriangle } from 'lucide-react';

export default function Session6Content() {
    return (
        <div className="space-y-12 text-white/90">
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <Box className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Introduction to Arrays</h2>
                </div>
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">1D Arrays</h3>
                    <p className="text-white/70 mb-4 leading-relaxed">
                        An array is a collection of elements of the same type placed in contiguous memory locations. It's used to store multiple values in a single variable, making it easier to manage and manipulate data sets.
                    </p>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 mb-6 overflow-x-auto">
                        <pre className="text-green-400">{`// Declaration and Initialization
int arr[5] = {1, 2, 3, 4, 5};

// Accessing elements (0-indexed)
cout << arr[0] << endl; // Prints 1
cout << arr[4] << endl; // Prints 5

// Iterating over an array
for(int i = 0; i < 5; i++) {
    cout << arr[i] << " ";
}`}</pre>
                    </div>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">2D Arrays (Matrices)</h3>
                    <p className="text-white/70 mb-4 leading-relaxed">
                        A 2D array is essentially an array of arrays. It is useful for representing grids, matrices, or any tabular data.
                    </p>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 mb-6 overflow-x-auto">
                        <pre className="text-green-400">{`// Declaration of a 3x4 matrix
int grid[3][4];

// Initialization
int matrix[2][3] = {
    {1, 2, 3},
    {4, 5, 6}
};

// Accessing elements
cout << matrix[1][2] << endl; // Prints 6 (row 1, column 2)`}</pre>
                    </div>
                </div>
            </section>

            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <Lightbulb className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Ad-Hoc Problems</h2>
                </div>
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">What are Ad-Hoc problems?</h3>
                    <p className="text-white/70 mb-4">
                        Ad-hoc problems do not fall into standard algorithmic categories (like Graph Theory or Dynamic Programming). They typically require careful reading, logical deduction, and translating the problem description directly into code.
                    </p>
                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4 mb-6">
                        <h4 className="text-blue-400 font-bold mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Code className="w-4 h-4" /> Tips for Solving Ad-Hoc
                        </h4>
                        <ul className="list-disc list-inside text-sm text-white/80 space-y-2 mt-2">
                            <li><strong>Read Carefully:</strong> Don't miss any details or constraints. Often the solution is literally written in the problem statement.</li>
                            <li><strong>Simulate:</strong> Try to simulate the process described in the problem using pen and paper on the given test cases.</li>
                            <li><strong>Edge Cases:</strong> Always think about the smallest and largest possible inputs. What if N=1 or N=100000?</li>
                            <li><strong>Data Types:</strong> Check if intermediate calculations could exceed the limits of standard integers (e.g., use <code>long long</code>).</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}
