import { useCallback } from 'react';
import { FileAuditEntry } from '../types/audit';

/**
 * Hook for file audit logging
 * Provides easy-to-use audit logging functions
 */
export const useFileAudit = () => {
    const logFileOperation = useCallback(async (
        operation: FileAuditEntry['operation'],
        fileName: string,
        fileType: FileAuditEntry['fileType'],
        module: FileAuditEntry['module'],
        options: {
            companyId: string;
            userId?: string;
            userName?: string;
            fileSize?: number;
            status?: FileAuditEntry['operationStatus'];
            description?: string;
            metadata?: FileAuditEntry['metadata'];
            errorMessage?: string;
        }
    ): Promise<void> => {
        try {
            // In production, this would call the backend API
            const auditEntry = {
                companyId: options.companyId,
                userId: options.userId || 'current-user',
                userName: options.userName || 'Usuário Atual',
                fileName,
                fileType,
                fileSize: options.fileSize || 0,
                operation,
                operationStatus: options.status || 'success',
                module,
                description: options.description || `${operation} de ${fileName}`,
                metadata: options.metadata,
                errorMessage: options.errorMessage
            };

            console.log('[FILE AUDIT]', auditEntry);

            // TODO: Call backend API
            // await window.electronAPI?.logFileAudit?.(auditEntry);
        } catch (error) {
            console.error('Failed to log audit entry:', error);
        }
    }, []);

    return { logFileOperation };
};
