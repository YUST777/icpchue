// Language configuration for the code editor

export interface Language {
    id: string;
    name: string;
    monaco: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
    { id: 'c', name: 'C', monaco: 'c' },
    { id: 'cpp', name: 'C++', monaco: 'cpp' },
    { id: 'java', name: 'Java', monaco: 'java' },
    { id: 'python', name: 'Python 3', monaco: 'python' },
    { id: 'kotlin', name: 'Kotlin', monaco: 'kotlin' }
];

export const TEMPLATES: Record<string, string> = {
    c: `#include <stdio.h>

int main() {
    
    return 0;
}`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(0); cin.tie(0);
    
    return 0;
}`,
    java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
    }
}`,
    python: `import sys

def main():
    pass

if __name__ == '__main__':
    main()`,
    kotlin: `import java.util.Scanner

fun main() {
    val scanner = Scanner(System.in)
    
}`
};

export function getLanguageById(id: string): Language | undefined {
    return SUPPORTED_LANGUAGES.find(l => l.id === id);
}

export function getTemplateForLanguage(langId: string): string {
    return TEMPLATES[langId] || '';
}
