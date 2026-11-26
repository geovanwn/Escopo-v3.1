import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, ArrowBigUpDash, Server, AlertTriangle, CheckCircle, Smartphone } from 'lucide-react';
import { Button } from './ui/Button';

// @ts-ignore
const electronAPI = (window as any).electronAPI;

export const SystemUpdater: React.FC = () => {
    const [status, setStatus] = useState<any>({ status: 'idle' });
    const [progress, setProgress] = useState(0);
    const [updateUrl, setUpdateUrl] = useState('');
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [isThinking, setIsThinking] = useState(false);

    useEffect(() => {
        if (electronAPI?.onUpdaterStatus) {
            const cleanup = electronAPI.onUpdaterStatus((status: any) => {
                console.log('Update Status:', status);
                setStatus(status);
                if (status.status === 'downloading') {
                    setProgress(status.progress);
                } else {
                    setIsThinking(false);
                }
            });
            return cleanup;
        }
    }, []);

    const handleCheckUpdate = async () => {
        setIsThinking(true);
        setStatus({ status: 'checking' });
        try {
            await electronAPI.checkForUpdates();
        } catch (error) {
            console.error(error);
            setStatus({ status: 'error', error: 'Falha ao iniciar verificação' });
            setIsThinking(false);
        }
    };

    const handleDownload = async () => {
        setIsThinking(true);
        try {
            await electronAPI.downloadUpdate();
        } catch (error) {
            setStatus({ status: 'error', error: 'Falha ao iniciar download' });
            setIsThinking(false);
        }
    };

    const handleInstall = async () => {
        if (confirm('O sistema será reiniciado para aplicar a atualização. Deseja continuar?')) {
            await electronAPI.quitAndInstall();
        }
    };

    const handleSaveUrl = async () => {
        if (!updateUrl) return;
        await electronAPI.setUpdateUrl(updateUrl);
        setIsConfiguring(false);
        handleCheckUpdate();
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <ArrowBigUpDash className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Atualização do Sistema</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie a versão do EscopoV3</p>
                    </div>
                </div>
                <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    Versão Atual: v1.0.0
                </div>
            </div>

            {/* Status Display */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-6 flex flex-col items-center justify-center min-h-[160px] border-2 border-dashed border-gray-200 dark:border-gray-600">

                {status.status === 'idle' && (
                    <div className="text-center">
                        <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">Nenhuma verificação recente.</p>
                        <Button onClick={handleCheckUpdate} className="mt-4" disabled={isThinking}>
                            {isThinking ? 'Verificando...' : 'Verificar Agora'}
                        </Button>
                    </div>
                )}

                {status.status === 'checking' && (
                    <div className="text-center animate-pulse">
                        <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin" />
                        <p className="text-blue-600 font-medium">Buscando atualizações...</p>
                    </div>
                )}

                {status.status === 'available' && (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Download className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold text-green-700 mb-1">Nova Versão Disponível!</h3>
                        <p className="text-gray-600 mb-4">Versão {status.version} está pronta para baixar.</p>
                        <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700 text-white px-8">
                            Baixar Atualização
                        </Button>
                    </div>
                )}

                {status.status === 'downloading' && (
                    <div className="w-full max-w-md">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-blue-600 font-semibold">Baixando... {progress.toFixed(0)}%</span>
                            <span className="text-gray-500">
                                {status.bytesPerSecond ? `${(status.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s` : ''}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                            <div
                                className="bg-blue-600 h-4 rounded-full transition-all duration-300 relative overflow-hidden"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                            </div>
                        </div>
                        <p className="text-xs text-center mt-2 text-gray-400">Por favor, aguarde o término do download.</p>
                    </div>
                )}

                {status.status === 'downloaded' && (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Smartphone className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold text-blue-700 mb-1">Download Concluído!</h3>
                        <p className="text-gray-600 mb-4">Reinicie o sistema para aplicar a versão {status.version}.</p>
                        <Button onClick={handleInstall} className="bg-blue-600 hover:bg-blue-700 text-white px-8 heartbeat">
                            Reiniciar e Instalar
                        </Button>
                    </div>
                )}

                {status.status === 'not-available' && (
                    <div className="text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">Você está atualizado!</h3>
                        <p className="text-gray-500 mb-4">Versão atual: v1.0.0</p>
                        <Button onClick={handleCheckUpdate} variant="outline" size="sm">
                            Verificar Novamente
                        </Button>
                    </div>
                )}

                {status.status === 'error' && (
                    <div className="text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <h3 className="text-red-600 font-bold">Erro na Verificação</h3>
                        <p className="text-gray-500 max-w-xs mx-auto mb-4 text-sm">{status.error || 'Verifique sua conexão ou configuração.'}</p>
                        <Button onClick={handleCheckUpdate} variant="outline" size="sm">
                            Tentar Novamente
                        </Button>
                    </div>
                )}
            </div>

            {/* Advanced Settings Toggle */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                    onClick={() => setIsConfiguring(!isConfiguring)}
                    className="flex items-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <Server className="w-4 h-4 mr-2" />
                    {isConfiguring ? 'Ocultar Configurações Avançadas' : 'Configurações de Servidor'}
                </button>

                {isConfiguring && (
                    <div className="mt-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">URL do Servidor de Atualização</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={updateUrl}
                                onChange={(e) => setUpdateUrl(e.target.value)}
                                placeholder="https://seu-servidor.com/updates/"
                                className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
                            />
                            <Button onClick={handleSaveUrl} size="sm">Salvar</Button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            * Use para testar servidores locais ou links diretos. O padrão é definido na compilação.
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .heartbeat {
                    animation: heartbeat 1.5s ease-in-out infinite both;
                }
                @keyframes heartbeat {
                    from { transform: scale(1); transform-origin: center center; animation-timing-function: ease-out; }
                    10% { transform: scale(1.04); animation-timing-function: ease-in; }
                    17% { transform: scale(0.98); animation-timing-function: ease-out; }
                    33% { transform: scale(1.04); animation-timing-function: ease-in; }
                    45% { transform: scale(1); animation-timing-function: ease-out; }
                }
            `}</style>
        </div>
    );
};
