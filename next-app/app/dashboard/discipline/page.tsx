'use client';

import React from 'react';
import DisciplineTracker from '@/components/dashboard/discipline/DisciplineTracker';

export default function DisciplinePage() {
    return (
        <div className="min-h-screen bg-[#0B0B0C] text-white p-3 md:p-6 max-w-7xl mx-auto space-y-4">
            <DisciplineTracker isMentorView={false} />
        </div>
    );
}
