'use client';

import React from 'react';
import DisciplineTracker from '@/components/dashboard/discipline/DisciplineTracker';

export default function DisciplinePage() {
    return (
        <div className="space-y-6 animate-fade-in text-white">
            <DisciplineTracker isMentorView={false} />
        </div>
    );
}
