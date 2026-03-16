'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface MapExpandedContextType {
    expandedId: string | null
    setExpandedId: (id: string | null) => void
}

const MapExpandedContext = createContext<MapExpandedContextType | null>(null)

export function MapExpandedProvider({ children }: { children: ReactNode }) {
    const [expandedId, setExpandedId] = useState<string | null>(null)

    return (
        <MapExpandedContext.Provider value={{ expandedId, setExpandedId }}>
            {children}
        </MapExpandedContext.Provider>
    )
}

export function useMapExpanded() {
    const context = useContext(MapExpandedContext)
    if (!context) {
        throw new Error('useMapExpanded must be used within a MapExpandedProvider')
    }
    return context
}
