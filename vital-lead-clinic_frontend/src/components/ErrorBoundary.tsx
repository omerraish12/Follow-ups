// src/components/ErrorBoundary.tsx
import React, { useState, useEffect, ReactNode } from "react";

interface ErrorBoundaryProps {
    children: ReactNode;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const handleError = (error: any, errorInfo: any) => {
            console.error("Error caught by boundary:", error, errorInfo);
            setHasError(true);
        };

        // Attaching global error handler
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleError);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleError);
        };
    }, []);

    if (hasError) {
        return (
            <div className="p-4 text-center">
                <h2>Something went wrong.</h2>
                <button
                    className="mt-2 px-4 py-2 bg-primary text-white rounded"
                    onClick={() => setHasError(false)}
                >
                    Try again
                </button>
            </div>
        );
    }

    return <>{children}</>;
};

export default ErrorBoundary;