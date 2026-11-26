import { FileAuditEntry, AuditFilter, AuditStats } from '../types/audit';
import crypto from 'crypto';

/**
 * File Audit Service
 * Handles all file operation auditing with integrity verification
 */
export class FileAuditService {
    private static instance: FileAuditService;
    private auditLog: FileAuditEntry[] = [];

    private constructor() { }

    static getInstance(): FileAuditService {
        if (!FileAuditService.instance) {
            FileAuditService.instance = new FileAuditService();
        }
        return FileAuditService.instance;
    }

    /**
     * Generate SHA-256 hash for file integrity
     */
    static generateFileHash(content: string | Buffer): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Log a file operation
     */
    async logOperation(entry: Omit<FileAuditEntry, 'id' | 'timestamp'>): Promise<FileAuditEntry> {
        const auditEntry: FileAuditEntry = {
            ...entry,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString()
        };

        this.auditLog.push(auditEntry);

        // In production, this would persist to database
        console.log('[AUDIT]', auditEntry.operation.toUpperCase(), auditEntry.fileName,
            `by ${auditEntry.userName}`, auditEntry.operationStatus);

        return auditEntry;
    }

    /**
     * Query audit logs with filters
     */
    async queryLogs(filter: AuditFilter): Promise<FileAuditEntry[]> {
        let results = [...this.auditLog];

        if (filter.companyId) {
            results = results.filter(e => e.companyId === filter.companyId);
        }

        if (filter.userId) {
            results = results.filter(e => e.userId === filter.userId);
        }

        if (filter.fileType && filter.fileType.length > 0) {
            results = results.filter(e => filter.fileType!.includes(e.fileType));
        }

        if (filter.operation && filter.operation.length > 0) {
            results = results.filter(e => filter.operation!.includes(e.operation));
        }

        if (filter.module && filter.module.length > 0) {
            results = results.filter(e => filter.module!.includes(e.module));
        }

        if (filter.startDate) {
            results = results.filter(e => e.timestamp >= filter.startDate!);
        }

        if (filter.endDate) {
            results = results.filter(e => e.timestamp <= filter.endDate!);
        }

        if (filter.searchTerm) {
            const term = filter.searchTerm.toLowerCase();
            results = results.filter(e =>
                e.fileName.toLowerCase().includes(term) ||
                e.description.toLowerCase().includes(term) ||
                e.userName.toLowerCase().includes(term)
            );
        }

        if (filter.status && filter.status.length > 0) {
            results = results.filter(e => filter.status!.includes(e.operationStatus));
        }

        return results.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }

    /**
     * Get audit statistics
     */
    async getStats(filter: AuditFilter): Promise<AuditStats> {
        const logs = await this.queryLogs(filter);

        const stats: AuditStats = {
            totalOperations: logs.length,
            successfulOperations: logs.filter(l => l.operationStatus === 'success').length,
            failedOperations: logs.filter(l => l.operationStatus === 'failed').length,
            totalFilesProcessed: new Set(logs.map(l => l.fileName)).size,
            totalDataSize: logs.reduce((sum, l) => sum + l.fileSize, 0),
            operationsByType: {},
            operationsByModule: {},
            topUsers: []
        };

        // Count by operation type
        logs.forEach(log => {
            stats.operationsByType[log.operation] = (stats.operationsByType[log.operation] || 0) + 1;
            stats.operationsByModule[log.module] = (stats.operationsByModule[log.module] || 0) + 1;
        });

        // Top users
        const userCounts = new Map<string, { userName: string; count: number }>();
        logs.forEach(log => {
            const existing = userCounts.get(log.userId) || { userName: log.userName, count: 0 };
            existing.count++;
            userCounts.set(log.userId, existing);
        });

        stats.topUsers = Array.from(userCounts.entries())
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return stats;
    }

    /**
     * Export audit log to CSV
     */
    async exportToCSV(filter: AuditFilter): Promise<string> {
        const logs = await this.queryLogs(filter);

        const headers = [
            'Timestamp', 'User', 'Operation', 'File Name', 'File Type',
            'Module', 'Status', 'Size (KB)', 'Description'
        ];

        const rows = logs.map(log => [
            new Date(log.timestamp).toLocaleString('pt-BR'),
            log.userName,
            log.operation,
            log.fileName,
            log.fileType,
            log.module,
            log.operationStatus,
            (log.fileSize / 1024).toFixed(2),
            log.description
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csv;
    }

    /**
     * Clear old audit logs (retention policy)
     */
    async clearOldLogs(daysToKeep: number = 90): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffISO = cutoffDate.toISOString();

        const initialCount = this.auditLog.length;
        this.auditLog = this.auditLog.filter(log => log.timestamp >= cutoffISO);

        return initialCount - this.auditLog.length;
    }
}

export const fileAudit = FileAuditService.getInstance();
