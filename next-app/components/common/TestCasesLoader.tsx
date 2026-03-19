'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function TestCasesLoader() {
    const caseCount = 4;
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % (caseCount + 2)); // +2 for a pause at the end
        }, 300); // Speed of "judging"

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4">
                {[...Array(caseCount)].map((_, i) => {
                    // Logic: 
                    // i < activeIndex means "Passed" (Green)
                    // i === activeIndex means "Running" (Yellow/Gold)
                    // i > activeIndex means "Pending" (Gray)

                    let status = 'pending';
                    if (i < activeIndex) status = 'accepted';
                    if (i === activeIndex) status = 'running';

                    // Reset phase: if activeIndex is way past, visuals reset shortly after
                    if (activeIndex >= caseCount) status = 'accepted';

                    return (
                        <TestCaseDot key={i} status={status as 'pending' | 'running' | 'accepted'} />
                    );
                })}
            </div>
            <div className="h-8">
                <motion.span
                    key={activeIndex < caseCount ? "running" : "done"}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xl font-mono text-[#888] uppercase tracking-widest font-bold"
                >
                    {activeIndex < caseCount ? `Running Test ${activeIndex + 1}...` : 'Accepted'}
                </motion.span>
            </div>
        </div>
    );
}

function TestCaseDot({ status }: { status: 'pending' | 'running' | 'accepted' }) {
    const variants = {
        pending: { backgroundColor: '#333333', scale: 1, boxShadow: 'none' },
        running: {
            backgroundColor: '#E8C15A',
            scale: 1.2,
            boxShadow: '0 0 10px rgba(232, 193, 90, 0.5)'
        },
        accepted: {
            backgroundColor: '#4ADE80', // bright green
            scale: 1,
            boxShadow: '0 0 5px rgba(74, 222, 128, 0.3)'
        }
    };

    return (
        <motion.div
            initial="pending"
            animate={status}
            variants={variants}
            transition={{ duration: 0.2 }}
            className="w-12 h-12 rounded-md" // Slightly rounded square for "test case" look
        />
    );
}
