'use client';

import { ReactNode } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import ExtensionCFSync from '@/components/core/ExtensionCFSync';

interface ProvidersProps {
    children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <LanguageProvider>
            <AuthProvider>
                <ExtensionCFSync />
                {children}
            </AuthProvider>
        </LanguageProvider>
    );
}
