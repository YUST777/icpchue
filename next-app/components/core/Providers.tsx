'use client';

import { ReactNode } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import ModelPreloader from '@/components/3d/ModelPreloader';
import ExtensionCFSync from '@/components/core/ExtensionCFSync';

interface ProvidersProps {
    children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <LanguageProvider>
            <AuthProvider>
                <ModelPreloader />
                <ExtensionCFSync />
                {children}
            </AuthProvider>
        </LanguageProvider>
    );
}
