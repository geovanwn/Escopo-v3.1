// File Audit Viewer Component
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
    FileText, Download, Filter, Calendar, User, Activity,
    CheckCircle, XCircle, AlertCircle, Search, BarChart3,
    FileCode, Shield, Clock, HardDrive
} from 'lucide-react';
import { FileAuditEntry, AuditFilter, AuditStats } from '../../types/audit';
import { useData } from '../../contexts/DataContext';

interface FileAuditViewerProps {
    companyId?: string;
}

export const FileAuditViewer: React.FC<FileAuditViewerProps> = ({ companyId }) => {
    const { selectedCompany } = useData();
    const [auditLogs, setAuditLogs] = useState<FileAuditEntry[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'logs' | 'stats'>('logs');

    // Filters
    const [filter, setFilter] = useState<AuditFilter>({
        companyId: companyId || selectedCompany?.id,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOperation, setSelectedOperation] = useState<string[]>([]);
    const [selectedModule, setSelectedModule] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

    useEffect(() => {
        loadAuditData();
    }, [filter]);

    const loadAuditData = async () => {
        setIsLoading(true);
        try {
            // In production, this would call the backend API
            const mockLogs: FileAuditEntry[] = [
                {
                    id: '1',
                    companyId: selectedCompany?.id || '1',
                    timestamp: new Date().toISOString(),
                    userId: 'user1',
                    userName: 'João Silva',
                    userEmail: 'joao@example.com',
                    fileName: 'nfse_12345.xml',
                    fileType: 'nfse',
                    fileSize: 15360,
                    operation: 'download',
                    operationStatus: 'success',
                    module: 'nfse_fetcher',
                    description: 'Download de NFS-e via consulta certificado digital',
                    metadata: {
                        noteNumber: '12345',
                        value: 1500.00
                    }
                },
                {
                    id: '2',
                    companyId: selectedCompany?.id || '1',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    userId: 'user1',
                    userName: 'João Silva',
                    fileName: 'nfe_import.xml',
                    fileType: 'nfe',
                    fileSize: 25600,
                    operation: 'upload',
                    operationStatus: 'success',
                    module: 'fiscal',
                    description: 'Upload de NF-e para processamento',
                    metadata: {
                        accessKey: '35210512345678901234567890123456789012345678'
                    }
                },
                {
                    id: '3',
                    companyId: selectedCompany?.id || '1',
                    timestamp: new Date(Date.now() - 7200000).toISOString(),
                    userId: 'user2',
                    userName: 'Maria Santos',
                    fileName: 'certificado.pfx',
                    fileType: 'certificate',
                    fileSize: 4096,
                    operation: 'validate',
                    operationStatus: 'failed',
                    module: 'settings',
                    description: 'Tentativa de validação de certificado digital',
                    errorMessage: 'Senha incorreta'
                }
            ];

            setAuditLogs(mockLogs);

            // Calculate stats
            const mockStats: AuditStats = {
                totalOperations: mockLogs.length,
                successfulOperations: mockLogs.filter(l => l.operationStatus === 'success').length,
                failedOperations: mockLogs.filter(l => l.operationStatus === 'failed').length,
                totalFilesProcessed: new Set(mockLogs.map(l => l.fileName)).size,
                totalDataSize: mockLogs.reduce((sum, l) => sum + l.fileSize, 0),
                operationsByType: {
                    download: 1,
                    upload: 1,
                    validate: 1
                },
                operationsByModule: {
                    nfse_fetcher: 1,
                    fiscal: 1,
                    settings: 1
                },
                topUsers: [
                    { userId: 'user1', userName: 'João Silva', count: 2 },
                    { userId: 'user2', userName: 'Maria Santos', count: 1 }
                ]
            };

            setStats(mockStats);
        } catch (error) {
            console.error('Error loading audit data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportCSV = () => {
        const headers = ['Data/Hora', 'Usuário', 'Operação', 'Arquivo', 'Tipo', 'Módulo', 'Status', 'Tamanho'];
        const rows = auditLogs.map(log => [
            new Date(log.timestamp).toLocaleString('pt-BR'),
            log.userName,
            log.operation,
            log.fileName,
            log.fileType,
            log.module,
            log.operationStatus,
            `${(log.fileSize / 1024).toFixed(2)} KB`
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `auditoria_arquivos_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const getOperationIcon = (operation: string) => {
        switch (operation) {
            case 'download': return <Download size={14} className="text-blue-600" />;
            case 'upload': return <FileText size={14} className="text-green-600" />;
            case 'delete': return <XCircle size={14} className="text-red-600" />;
            case 'validate': return <Shield size={14} className="text-purple-600" />;
            default: return <Activity size={14} className="text-gray-600" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'success':
                return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Sucesso</span>;
            case 'failed':
                return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">Falha</span>;
            case 'partial':
                return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Parcial</span>;
            default:
                return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">{status}</span>;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="text-indigo-600" size={28} />
                        Auditoria de Arquivos
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Rastreamento completo de operações com arquivos XML e documentos fiscais
                    </p>
                </div>
                <Button onClick={handleExportCSV} variant="outline">
                    <Download size={16} className="mr-2" />
                    Exportar CSV
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'logs'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    <Activity size={16} className="inline mr-2" />
                    Registros de Auditoria
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'stats'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    <BarChart3 size={16} className="inline mr-2" />
                    Estatísticas
                </button>
            </div>

            {activeTab === 'logs' ? (
                <>
                    {/* Filters */}
                    <Card className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                    <Calendar size={12} className="inline mr-1" />
                                    Data Inicial
                                </label>
                                <input
                                    type="date"
                                    value={filter.startDate}
                                    onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                    <Calendar size={12} className="inline mr-1" />
                                    Data Final
                                </label>
                                <input
                                    type="date"
                                    value={filter.endDate}
                                    onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                    <Search size={12} className="inline mr-1" />
                                    Buscar
                                </label>
                                <input
                                    type="text"
                                    placeholder="Arquivo, usuário, descrição..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Audit Logs Table */}
                    <Card className="flex-1 overflow-hidden flex flex-col">
                        <div className="overflow-auto flex-1">
                            <table className="w-full">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Data/Hora</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Usuário</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Operação</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Arquivo</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Módulo</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Tamanho</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {auditLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 text-xs text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={12} className="text-slate-400" />
                                                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <User size={12} className="text-slate-400" />
                                                    <span className="font-medium text-slate-700">{log.userName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <div className="flex items-center gap-2">
                                                    {getOperationIcon(log.operation)}
                                                    <span className="capitalize">{log.operation}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <FileCode size={12} className="text-slate-400" />
                                                    <span className="font-mono text-slate-700">{log.fileName}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">{log.description}</div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-600 capitalize">{log.module.replace('_', ' ')}</td>
                                            <td className="px-4 py-3 text-xs">{getStatusBadge(log.operationStatus)}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600">
                                                <div className="flex items-center gap-1">
                                                    <HardDrive size={12} className="text-slate-400" />
                                                    {(log.fileSize / 1024).toFixed(2)} KB
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            ) : (
                /* Statistics View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-600">Total de Operações</h3>
                            <Activity className="text-indigo-600" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats?.totalOperations || 0}</p>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-600">Operações com Sucesso</h3>
                            <CheckCircle className="text-green-600" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-green-600">{stats?.successfulOperations || 0}</p>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-600">Operações com Falha</h3>
                            <XCircle className="text-red-600" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-red-600">{stats?.failedOperations || 0}</p>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-600">Arquivos Processados</h3>
                            <FileText className="text-blue-600" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats?.totalFilesProcessed || 0}</p>
                    </Card>

                    <Card className="p-6 md:col-span-2">
                        <h3 className="text-sm font-bold text-slate-700 mb-4">Operações por Tipo</h3>
                        <div className="space-y-2">
                            {Object.entries(stats?.operationsByType || {}).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 capitalize">{type}</span>
                                    <span className="text-sm font-bold text-slate-800">{count}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-6 md:col-span-2">
                        <h3 className="text-sm font-bold text-slate-700 mb-4">Usuários Mais Ativos</h3>
                        <div className="space-y-2">
                            {stats?.topUsers.map((user) => (
                                <div key={user.userId} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">{user.userName}</span>
                                    <span className="text-sm font-bold text-slate-800">{user.count} operações</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
