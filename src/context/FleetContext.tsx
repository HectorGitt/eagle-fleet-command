import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateTractorTelemetry, type TractorTelemetry } from '@/lib/telemetry';

interface FleetContextType {
    tractors: TractorTelemetry[];
    getTractor: (id: string) => TractorTelemetry | undefined;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export function FleetProvider({ children }: { children: ReactNode }) {
    const [tractors, setTractors] = useState<TractorTelemetry[]>([]);

    useEffect(() => {
        // Initialize tractors
        const initialTractors = Array.from({ length: 10 }, (_, i) =>
            generateTractorTelemetry(`T-${800 + i}`)
        );
        setTractors(initialTractors);

        // Update telemetry every 3 seconds
        const interval = setInterval(() => {
            setTractors((prev) =>
                prev.map((t) => generateTractorTelemetry(t.tractorId, t))
            );
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const getTractor = (id: string) => tractors.find(t => t.tractorId === id);

    return (
        <FleetContext.Provider value={{ tractors, getTractor }}>
            {children}
        </FleetContext.Provider>
    );
}

export function useFleet() {
    const context = useContext(FleetContext);
    if (context === undefined) {
        throw new Error('useFleet must be used within a FleetProvider');
    }
    return context;
}
