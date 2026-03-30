
export const TEMPLATES: Record<string, string> = {
    c: `#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(0); cin.tie(0);\n    \n    return 0;\n}`,
    java: `import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}`,
    python: `import sys\n\ndef main():\n    pass\n\nif __name__ == '__main__':\n    main()`,
    javascript: `const readline = require('readline');\n\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\nrl.on('line', (line) => {\n    \n});`,
    csharp: `using System;\n\npublic class Program\n{\n    public static void Main()\n    {\n        \n    }\n}`,
    kotlin: `import java.util.Scanner\n\nfun main() {\n    val scanner = Scanner(System.` + `in` + `)\n    \n}`,
    go: `package main\n\nimport "fmt"\n\nfunc main() {\n    \n}`,
    rust: `use std::io;\n\nfn main() {\n    \n}`
};

export const SUPPORTED_LANGUAGES = [
    { id: 'c', name: 'C', monaco: 'c' },
    { id: 'cpp', name: 'C++', monaco: 'cpp' },
    { id: 'java', name: 'Java', monaco: 'java' },
    { id: 'python', name: 'Python', monaco: 'python' },
    { id: 'javascript', name: 'Node.js', monaco: 'javascript' },
    { id: 'csharp', name: 'C#', monaco: 'csharp' },
    { id: 'kotlin', name: 'Kotlin', monaco: 'kotlin' },
    { id: 'go', name: 'Go', monaco: 'go' },
    { id: 'rust', name: 'Rust', monaco: 'rust' }
];
