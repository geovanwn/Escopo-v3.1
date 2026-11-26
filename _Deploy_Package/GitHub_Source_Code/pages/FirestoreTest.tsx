import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { runAllTests, testFirestoreOperations, testCompanyOperations } from '../utils/testFirestore';

export const FirestoreTest: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<{
        general?: boolean;
        company?: boolean;
    }>({});

    const handleRunAllTests = async () => {
        setIsRunning(true);
        setResults({});

        console.log('🧪 Iniciando testes do console...');

        const generalTest = await testFirestoreOperations();
        setResults(prev => ({ ...prev, general: generalTest }));

        const companyTest = await testCompanyOperations();
        setResults(prev => ({ ...prev, company: companyTest }));

        setIsRunning(false);
    };

    const getStatusIcon = (status?: boolean) => {
        if (status === undefined) return <AlertCircle className="text-gray-400" size={20} />;
        return status ? <CheckCircle className="text-green-500" size={20} /> : <XCircle className="text-red-500" size={20} />;
    };

    const getStatusText = (status?: boolean) => {
        if (status === undefined) return 'Aguardando...';
        return status ? 'PASSOU ✅' : 'FALHOU ❌';
    };

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-black text-[var(--text-primary)]">Teste de Operações Firestore</h1>
                <p className="text-[var(--text-secondary)] mt-2">
                    Valide se o sistema está configurado corretamente para criar, ler, atualizar e excluir dados.
                </p>
            </div>

            <Card className="p-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Executar Testes CRUD</h3>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                Este teste irá validar todas as operações do Firestore
                            </p>
                        </div>
                        <button
                            onClick={handleRunAllTests}
                            disabled={isRunning}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all ${isRunning
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:scale-105'
                                }`}
                        >
                            <Play size={18} />
                            {isRunning ? 'Executando...' : 'Executar Testes'}
                        </button>
                    </div>

                    {Object.keys(results).length > 0 && (
                        <div className="mt-6 space-y-3 pt-6 border-t border-[var(--border-color)]">
                            <h4 className="font-bold text-[var(--text-primary)] mb-4">Resultados:</h4>

                            <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(results.general)}
                                    <div>
                                        <div className="font-bold text-[var(--text-primary)]">Teste CRUD Geral</div>
                                        <div className="text-xs text-[var(--text-secondary)]">
                                            Create, Read, Update, Delete
                                        </div>
                                    </div>
                                </div>
                                <div className="font-bold text-sm">
                                    {getStatusText(results.general)}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(results.company)}
                                    <div>
                                        <div className="font-bold text-[var(--text-primary)]">Teste de Empresas</div>
                                        <div className="text-xs text-[var(--text-secondary)]">
                                            Operações específicas com companies
                                        </div>
                                    </div>
                                </div>
                                <div className="font-bold text-sm">
                                    {getStatusText(results.company)}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <div className="flex gap-3">
                            <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                            <div className="text-sm">
                                <p className="font-bold text-blue-900 dark:text-blue-100 mb-2">
                                    ℹ️ Importante
                                </p>
                                <ul className="space-y-1 text-blue-800 dark:text-blue-200 list-disc list-inside">
                                    <li>Abra o console do navegador (F12) para ver logs detalhados</li>
                                    <li>Os testes criam e excluem documentos automaticamente</li>
                                    <li>Certifique-se de estar autenticado antes de executar</li>
                                    <li>Se houver erros de permissão, atualize as regras do Firestore no Firebase Console</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
                    Regras do Firestore Configuradas
                </h3>
                <div className="bg-[var(--bg-secondary)] p-4 rounded-xl font-mono text-xs overflow-x-auto">
                    <pre className="text-[var(--text-secondary)]">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regra universal
    match /{collection}/{document} {
      allow create: if request.auth != null;
      allow read, update, delete: 
        if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Perfil do usuário
    match /users/{userId} {
      allow read, write: 
        if request.auth != null && 
        request.auth.uid == userId;
    }
    
    // Logs de auditoria
    match /audit_logs/{logId} {
      allow create: if request.auth != null;
      allow read: 
        if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}`}</pre>
                </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-3">
                    ✅ Operações Suportadas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                            <CheckCircle size={16} />
                            <span className="font-semibold">CREATE</span> - Criar documentos
                        </div>
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                            <CheckCircle size={16} />
                            <span className="font-semibold">READ</span> - Ler documentos (filtrado por userId)
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                            <CheckCircle size={16} />
                            <span className="font-semibold">UPDATE</span> - Atualizar documentos próprios
                        </div>
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                            <CheckCircle size={16} />
                            <span className="font-semibold">DELETE</span> - Excluir documentos próprios
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};
