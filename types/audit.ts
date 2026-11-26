// Audit Types for File Operations

export interface FileAuditEntry {
    id: string;
    companyId: string;
    timestamp: string;
    userId: string;
    userName: string;
    userEmail?: string;

    // File Information
    fileName: string;
    fileType: 'nfse' | 'nfe' | 'cte' | 'mdfe' | 'xml' | 'pdf' | 'certificate' | 'other';
    fileSize: number; // in bytes
    fileHash?: string; // SHA-256 hash for integrity
    filePath?: string; // Relative path if stored

    // Operation Details
    operation: 'upload' | 'download' | 'delete' | 'view' | 'edit' | 'import' | 'export' | 'validate' | 'sign';
    operationStatus: 'success' | 'failed' | 'partial';

    // Context
    module: 'fiscal' | 'xmls' | 'nfse_fetcher' | 'inventory' | 'financial' | 'settings' | 'other';
    description: string;

    // Technical Details
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;

    // Metadata
    metadata?: {
        noteNumber?: string;
        accessKey?: string;
        issueDate?: string;
        value?: number;
        cnpj?: string;
        [key: string]: any;
    };
}

export interface AuditFilter {
    companyId?: string;
    userId?: string;
    fileType?: string[];
    operation?: string[];
    module?: string[];
    startDate?: string;
    endDate?: string;
    searchTerm?: string;
    status?: string[];
}

export interface AuditStats {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    totalFilesProcessed: number;
    totalDataSize: number;
    operationsByType: Record<string, number>;
    operationsByModule: Record<string, number>;
    topUsers: Array<{ userId: string; userName: string; count: number }>;
}
