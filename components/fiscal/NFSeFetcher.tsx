
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Search, Loader2, CheckCircle, AlertTriangle, FileText, Server, Lock, Calendar, Download, Printer } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useData } from '../../contexts/DataContext';
import { useFileAudit } from '../../hooks/useFileAudit';

interface NFSeFetcherProps {
    onClose?: () => void;
}

export const NFSeFetcher: React.FC<NFSeFetcherProps> = ({ onClose }) => {
    const { addToast } = useToast();
    const { selectedCompany } = useData();
    const { logFileOperation } = useFileAudit();

    // State
    const [useCompanyCert, setUseCompanyCert] = useState(false);
    const [certPath, setCertPath] = useState('');
    const [password, setPassword] = useState('');
    const [certInfo, setCertInfo] = useState<any>(null);
    const [endpoint, setEndpoint] = useState(''); // Use selector or type URL
    const [queryType, setQueryType] = useState<'issued' | 'received'>('issued'); // New filter
    const [noteNumber, setNoteNumber] = useState(''); // New filter
    const [rpsNumber, setRpsNumber] = useState(''); // New filter
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Auto-load if saved in company (simulation)
    useEffect(() => {
        if (selectedCompany && (selectedCompany as any).certificate) {
            // If we had the path stored, we could pre-fill. 
            // For security, password usually isn't stored in plain text in frontend state unless decrypted.
        }
    }, [selectedCompany]);

    const handleFileSelect = async () => {
        try {
            if (window.electronAPI && window.electronAPI.selectCertificateFile) {
                const path = await window.electronAPI.selectCertificateFile();
                if (path) {
                    setCertPath(path);
                }
            } else {
                // Fallback for logic where Electron API might be missing or older version
                addToast("Erro: API nativa de seleção de arquivos não encontrada.", "error");
            }
        } catch (err) {
            console.error(err);
            addToast("Falha ao abrir seletor de arquivos.", "error");
        }
    };

    const handleDownloadNote = async (note: any) => {
        const fileName = `nfse_${note.numero}.xml`;
        const blob = new Blob([note.xml], { type: 'text/xml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Audit Log: Individual XML download
        await logFileOperation(
            'download',
            fileName,
            'nfse',
            'nfse_fetcher',
            {
                companyId: selectedCompany?.id || '',
                userName: 'Usuário Atual',
                fileSize: note.xml.length,
                status: 'success',
                description: `Download individual de NFS-e número ${note.numero}`,
                metadata: {
                    noteNumber: note.numero,
                    issueDate: note.dataEmissao,
                    value: note.valor,
                    provider: note.prestador,
                    taker: note.tomador
                }
            }
        );
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const total = result?.parsedNotes?.reduce((acc: number, note: any) => acc + note.valor, 0) || 0;

        printWindow.document.write(`
            <html>
            <head>
                <title>Relatório de Notas Fiscais</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    h1 { margin-bottom: 5px; }
                    .meta { color: #666; font-size: 14px; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                    th { background-color: #f2f2f2; }
                    .total { margin-top: 15px; font-weight: bold; text-align: right; font-size: 16px; }
                    @media print { button { display: none; } }
                </style>
            </head>
            <body>
                <h1>Relatório de Notas Fiscais - ${queryType === 'issued' ? 'Emitidas' : 'Recebidas'}</h1>
                <div class="meta">
                    <strong>Empresa:</strong> ${selectedCompany?.razaoSocial} | <strong>CNPJ:</strong> ${selectedCompany?.cnpj}<br>
                    <strong>Período:</strong> ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Emissão</th>
                            <th>Prestador</th>
                            <th>Tomador</th>
                            <th style="text-align: right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result?.parsedNotes?.map((note: any) => `
                            <tr>
                                <td>${note.numero}</td>
                                <td>${new Date(note.dataEmissao).toLocaleDateString()}</td>
                                <td>${note.prestador}</td>
                                <td>${note.tomador}</td>
                                <td style="text-align: right">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(note.valor)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="total">Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</div>
                <script>window.print();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleTestCertificate = async () => {
        if (!certPath || !password) {
            addToast('Selecione o arquivo PFX e informe a senha.', 'warning');
            return;
        }

        setIsLoading(true);
        setError(null);
        setCertInfo(null);

        try {
            const info = await window.electronAPI.getCertificateInfo(certPath, password);
            if (info.success) {
                setCertInfo(info);
                addToast('Certificado validado com sucesso!', 'success');
            } else {
                setError(info.error);
                addToast('Falha ao validar certificado.', 'error');
            }
        } catch (err) {
            setError('Erro desconhecido ao validar.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFetch = async () => {
        if (!certInfo) {
            addToast('Valide o certificado antes de buscar.', 'warning');
            return;
        }
        if (!selectedCompany?.cnpj) {
            addToast('Empresa selecionada não possui CNPJ.', 'error');
            return;
        }
        if (!endpoint) {
            addToast('Selecione ou informe um Endpoint de Prefeitura.', 'warning');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await window.electronAPI.fetchNFSe({
                pfxPath: useCompanyCert ? undefined : certPath,
                pfxBase64: useCompanyCert ? selectedCompany?.certificate?.pfxBase64 : undefined,
                password,
                startDate,
                endDate,
                cnpj: selectedCompany.cnpj,
                endpoint,
                queryType,
                noteNumber,
                rpsNumber
            });

            if (response.success) {
                // Parse XML specific fields (Generic ABRASF parser)
                let parsedNotes: any[] = [];
                try {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(response.data, "text/xml");

                    // Try to find CompNfse or just Nfse
                    const comps = xmlDoc.getElementsByTagName("CompNfse");
                    const targetNodes = comps.length > 0 ? comps : xmlDoc.getElementsByTagName("Nfse");

                    for (let i = 0; i < targetNodes.length; i++) {
                        const node = targetNodes[i];
                        const inf = node.getElementsByTagName("InfNfse")[0] || node.getElementsByTagName("infNFSe")[0];
                        const valores = node.getElementsByTagName("ValoresNfse")[0] || node.getElementsByTagName("Valores")[0] || node.getElementsByTagName("valores")[0];
                        const prestador = node.getElementsByTagName("PrestadorServico")[0] || node.getElementsByTagName("Prestador")[0] || node.getElementsByTagName("emit")[0];
                        const tomador = node.getElementsByTagName("TomadorServico")[0] || node.getElementsByTagName("Tomador")[0] || node.getElementsByTagName("toma")[0];

                        const numero = inf?.getElementsByTagName("Numero")[0]?.textContent || inf?.getElementsByTagName("nNFSe")[0]?.textContent;
                        const dataEmissao = inf?.getElementsByTagName("DataEmissao")[0]?.textContent || node.getElementsByTagName("dhEmi")[0]?.textContent || inf?.getElementsByTagName("dhProc")[0]?.textContent;
                        const valorText = valores?.getElementsByTagName("ValorLiquidoNfse")[0]?.textContent || 
                                          valores?.getElementsByTagName("ValorServicos")[0]?.textContent || 
                                          valores?.getElementsByTagName("vLiq")[0]?.textContent || 
                                          node.getElementsByTagName("vServ")[0]?.textContent;
                        const valor = valorText || '0';

                        const prestadorNome = prestador?.getElementsByTagName("RazaoSocial")[0]?.textContent || prestador?.getElementsByTagName("xNome")[0]?.textContent;
                        const tomadorNome = tomador?.getElementsByTagName("RazaoSocial")[0]?.textContent || tomador?.getElementsByTagName("xNome")[0]?.textContent;

                        // Nova extração de Impostos / Tributos
                        const vISSQNText = valores?.getElementsByTagName("ValorIss")[0]?.textContent || node.getElementsByTagName("vISSQN")[0]?.textContent || '0';
                        const vBCText = valores?.getElementsByTagName("BaseCalculo")[0]?.textContent || node.getElementsByTagName("vBC")[0]?.textContent || '0';
                        const vPISText = node.getElementsByTagName("ValorPis")[0]?.textContent || node.getElementsByTagName("vPIS")[0]?.textContent || '0';
                        const vCOFINSText = node.getElementsByTagName("ValorCofins")[0]?.textContent || node.getElementsByTagName("vCOFINS")[0]?.textContent || '0';
                        const vINSSText = node.getElementsByTagName("ValorInss")[0]?.textContent || node.getElementsByTagName("vINSS")[0]?.textContent || '0';
                        const vIRText = node.getElementsByTagName("ValorIr")[0]?.textContent || node.getElementsByTagName("vIRFF")[0]?.textContent || '0';
                        const vCSLLText = node.getElementsByTagName("ValorCsll")[0]?.textContent || node.getElementsByTagName("vCSLL")[0]?.textContent || '0';

                        if (numero) {
                            parsedNotes.push({
                                numero,
                                dataEmissao,
                                valor: parseFloat(valor),
                                baseCalculo: parseFloat(vBCText),
                                iss: parseFloat(vISSQNText),
                                pis: parseFloat(vPISText),
                                cofins: parseFloat(vCOFINSText),
                                inss: parseFloat(vINSSText),
                                ir: parseFloat(vIRText),
                                csll: parseFloat(vCSLLText),
                                prestador: prestadorNome,
                                tomador: tomadorNome,
                                xml: new XMLSerializer().serializeToString(node)
                            });
                        }
                    }
                } catch (e) {
                    console.error("Erro ao fazer parse do XML", e);
                }

                setResult({ ...response, parsedNotes });
                addToast(`Consulta realizada! ${parsedNotes.length} notas encontradas.`, 'success');

                // Audit Log: Successful fetch
                await logFileOperation(
                    'download',
                    `nfse_consulta_${new Date().toISOString().split('T')[0]}.xml`,
                    'nfse',
                    'nfse_fetcher',
                    {
                        companyId: selectedCompany?.id || '',
                        userName: 'Usuário Atual', // TODO: Get from auth context
                        fileSize: response.data?.length || 0,
                        status: 'success',
                        description: `Consulta de ${parsedNotes.length} NFS-e via certificado digital (${queryType === 'issued' ? 'Emitidas' : 'Recebidas'})`,
                        metadata: {
                            queryType,
                            startDate,
                            endDate,
                            noteCount: parsedNotes.length,
                            endpoint,
                            totalValue: parsedNotes.reduce((sum, n) => sum + n.valor, 0)
                        }
                    }
                );
            } else {
                setError(response.error);
                if (response.details) {
                    // If we have XML details even on error (like SOAP Fault)
                    setResult({ data: response.details, isError: true });
                }
                addToast('Erro na consulta.', 'error');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 p-6 rounded-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Server className="text-indigo-600" />
                        Consulta NFS-e via Certificado
                    </h2>
                    <p className="text-sm text-slate-500">Busca direta na prefeitura/ambiente nacional usando Certificado A1</p>
                </div>
                {onClose && (
                    <Button variant="ghost" onClick={onClose}>Fechar</Button>
                )}
            </div>

            {!window.electronAPI && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded-r-lg">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-amber-700">
                                <strong>Funcionalidade Indisponível no Navegador.</strong> <br />
                                Esta função requer acesso direto ao sistema de arquivos para leitura segura de certificados, disponível apenas no aplicativo Desktop.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
                {/* CONFIGURATION PANEL */}
                <Card className="lg:col-span-1 p-5 flex flex-col gap-4 overflow-y-auto">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide border-b pb-2 mb-2 flex items-center gap-2">
                        <Lock size={16} /> Configuração
                    </h3>

                    {selectedCompany?.certificate?.pfxBase64 && (
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useCompanyCert}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setUseCompanyCert(checked);
                                        if (checked) {
                                            setCertPath('Certificado Cadastrado na Empresa');
                                            setPassword(selectedCompany?.certificate?.password || '');
                                            // Mock validation for registered cert
                                            setCertInfo({
                                                commonName: selectedCompany?.razaoSocial,
                                                validTo: selectedCompany?.certificate?.validity || new Date().toISOString(),
                                                issuer: selectedCompany?.certificate?.issuer || 'Certificado Cadastrado',
                                                organization: selectedCompany?.razaoSocial
                                            });
                                            setError(null);
                                        } else {
                                            setCertPath('');
                                            setPassword('');
                                            setCertInfo(null);
                                        }
                                    }}
                                    className="accent-emerald-600 w-4 h-4"
                                />
                                <span className="text-sm font-bold text-emerald-700">Usar Certificado Cadastrado</span>
                            </label>
                            <p className="text-[10px] text-emerald-600 mt-1 ml-6">
                                Validade: {selectedCompany.certificate.validity || 'N/A'}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Arquivo do Certificado (.pfx / .p12)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={certPath}
                                readOnly
                                className={`w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 ${useCompanyCert ? 'opacity-50 cursor-not-allowed' : ''}`}
                                placeholder="Nenhum arquivo selecionado"
                            />
                            <Button
                                variant="secondary"
                                onClick={handleFileSelect}
                                className="whitespace-nowrap"
                                disabled={useCompanyCert}
                            >
                                Selecionar
                            </Button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Senha do Certificado</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            disabled={useCompanyCert}
                            className={`w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${useCompanyCert ? 'bg-slate-50 opacity-50' : ''}`}
                            placeholder="senha"
                        />
                    </div>

                    <Button
                        onClick={handleTestCertificate}
                        disabled={isLoading || !certPath || !password || useCompanyCert}
                        className="w-full mt-2"
                        variant={certInfo ? 'primary' : 'secondary'}
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : certInfo ? 'Certificado Validado (Pronto para Uso)' : 'Validar Certificado'}
                    </Button>

                    {certInfo && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mt-2 text-xs">
                            <div className="flex items-center gap-2 text-emerald-700 font-bold mb-1">
                                <CheckCircle size={14} /> Certificado OK
                            </div>
                            <p className="text-slate-600 truncate"><strong>Titular:</strong> {certInfo.commonName}</p>
                            <p className="text-slate-600"><strong>Validade:</strong> {new Date(certInfo.validTo).toLocaleDateString()}</p>
                            <p className="text-slate-600 truncate"><strong>Emissor:</strong> {certInfo.issuer.split(',')[0]}</p>
                        </div>
                    )}

                    {error && !result && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 mt-2 text-xs text-red-600 flex items-start gap-2">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="border-t pt-4 mt-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Endpoint API (SOAP)</label>
                        <input
                            type="text"
                            value={endpoint}
                            onChange={e => setEndpoint(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 font-mono"
                            placeholder="https://..."
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                            Padrão: Ambiente Nacional (Homologação). Para produção, altere ou configure para sua prefeitura.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 mb-4 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setQueryType('issued')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${queryType === 'issued' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
                        >
                            Notas Emitidas
                        </button>
                        <button
                            onClick={() => setQueryType('received')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${queryType === 'received' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
                        >
                            Notas Recebidas
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Data Inicial</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Data Final</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Cód. / Número Nota</label>
                            <input
                                type="text"
                                value={noteNumber}
                                onChange={e => setNoteNumber(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs placeholder:text-slate-300"
                                placeholder="Opcional"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Número RPS</label>
                            <input
                                type="text"
                                value={rpsNumber}
                                onChange={e => setRpsNumber(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs placeholder:text-slate-300"
                                placeholder="Opcional"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleFetch}
                        disabled={isLoading || !certInfo}
                        className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Consultar Notas'}
                    </Button>

                </Card>

                {/* RESULTS PANEL */}
                <Card className="lg:col-span-2 p-0 flex flex-col overflow-hidden bg-white border-slate-200 shadow-sm h-full">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                            <FileText size={16} className="text-indigo-600" /> Resultado da Requisição ({result?.parsedNotes?.length || 0})
                        </h3>
                        <div className="flex items-center gap-2">
                            {result && (
                                <span className={`text-xs px-2 py-1 rounded font-bold ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    Status: {result.status || 'Erro'}
                                </span>
                            )}
                            {result?.parsedNotes?.length > 0 && (
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={handlePrint}>
                                        <Printer size={14} className="mr-1" /> Imprimir
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => {
                                        const blob = new Blob([result.data], { type: 'text/xml' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `retorno_nfse_${new Date().toISOString()}.xml`;
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);
                                    }}>
                                        <Download size={14} className="mr-1" /> Baixar Retorno Completo
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-0">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 min-h-[300px]">
                                <Loader2 className="animate-spin w-12 h-12 text-indigo-500" />
                                <p className="text-sm font-medium">Consultando Prefeitura...</p>
                                <p className="text-xs text-slate-400">Isso pode levar alguns segundos dependendo da resposta do servidor.</p>
                            </div>
                        ) : !result ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 min-h-[300px] opacity-60">
                                <Server size={48} />
                                <p className="text-sm">Configure os parâmetros e clique em "Consultar Notas"</p>
                            </div>
                        ) : result.parsedNotes && result.parsedNotes.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 text-xs font-bold text-slate-500 border-b border-slate-100">Número</th>
                                        <th className="p-3 text-xs font-bold text-slate-500 border-b border-slate-100">Emissão</th>
                                        <th className="p-3 text-xs font-bold text-slate-500 border-b border-slate-100">Prestador</th>
                                        <th className="p-3 text-xs font-bold text-slate-500 border-b border-slate-100">Tomador</th>
                                        <th className="p-3 text-xs font-bold text-slate-500 border-b border-slate-100 text-right">Valor (R$)</th>
                                        <th className="p-3 text-xs font-bold text-slate-500 border-b border-slate-100 text-right">Tributos (R$)</th>
                                        <th className="p-3 text-xs font-bold text-slate-500 border-b border-slate-100 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {result.parsedNotes.map((note: any, idx: number) => {
                                        const totalTributos = (note.iss || 0) + (note.pis || 0) + (note.cofins || 0) + (note.inss || 0) + (note.ir || 0) + (note.csll || 0);
                                        const tributosText = `ISS: ${note.iss} | PIS: ${note.pis} | COFINS: ${note.cofins}\nIR: ${note.ir} | INSS: ${note.inss} | CSLL: ${note.csll}\nBase de Cálculo: ${note.baseCalculo}`;
                                        return (
                                        <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="p-3 text-xs font-medium text-slate-700">{note.numero}</td>
                                            <td className="p-3 text-xs text-slate-600">{new Date(note.dataEmissao).toLocaleDateString()}</td>
                                            <td className="p-3 text-xs text-slate-600 max-w-[150px] truncate" title={note.prestador}>{note.prestador}</td>
                                            <td className="p-3 text-xs text-slate-600 max-w-[150px] truncate" title={note.tomador}>{note.tomador}</td>
                                            <td className="p-3 text-xs font-bold text-slate-700 text-right">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(note.valor)}
                                            </td>
                                            <td className="p-3 text-xs font-medium text-slate-500 text-right cursor-help" title={tributosText}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalTributos)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleDownloadNote(note)}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                    title="Baixar XML Individual"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 m-4 rounded-xl border border-dashed border-slate-200">
                                <AlertTriangle className="text-amber-500 mb-2" size={24} />
                                <h4 className="text-sm font-bold text-slate-700">Nenhuma nota encontrada</h4>
                                <p className="text-xs text-slate-500 text-center max-w-xs mt-1 mb-4">
                                    O servidor da prefeitura retornou sucesso mas não enviou notas para os filtros selecionados.
                                </p>
                                <div className="w-full bg-slate-100 p-2 rounded text-[10px] font-mono text-slate-600 overflow-auto max-h-[200px] border border-slate-200">
                                    {typeof result?.data === 'string' ? result.data.substring(0, 500) : JSON.stringify(result?.data).substring(0, 500)}...
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};
