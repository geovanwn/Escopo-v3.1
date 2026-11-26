// Audit Page - Main entry point for file audit system
import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const FileAuditViewer = lazy(() => import('../components/audit/FileAuditViewer').then(m => ({ default: m.FileAuditViewer })));

export const Audit: React.FC = () => {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
            </div>
        }>
            <FileAuditViewer />
        </Suspense>
    );
};
