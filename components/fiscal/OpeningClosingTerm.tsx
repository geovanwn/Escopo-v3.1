import React, { useState } from 'react';
import { jsPDF } from "jspdf";
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Printer, Download, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const OpeningClosingTerm: React.FC = () => {
    const { selectedCompany, partners, employees } = useData();
    const [bookType, setBookType] = useState('Entradas');
    const [termType, setTermType] = useState('Abertura');
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-01-01'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-12-31'));
    const [bookNumber, setBookNumber] = useState('001');
    const [initialPage, setInitialPage] = useState('1');
    const [totalPages, setTotalPages] = useState('50');
    const [closingStockValue, setClosingStockValue] = useState('0,00');

    // Filter partners and employees belonging to the current selected company
    const companyPartners = partners.filter(p => !p.companyId || !selectedCompany?.id || p.companyId === selectedCompany.id);
    const companyEmployees = employees.filter(e => !e.companyId || !selectedCompany?.id || e.companyId === selectedCompany.id);

    const [selectedRepresentativeId, setSelectedRepresentativeId] = useState<string>('');
    const [selectedAccountantId, setSelectedAccountantId] = useState<string>('');

    // Find Signatories
    const representative = (() => {
        if (selectedRepresentativeId) {
            const selected = companyPartners.find(p => p.id === selectedRepresentativeId);
            if (selected) return selected;
        }

        const found = companyPartners.find(p => {
            const role = (p.role || '').toLowerCase();
            const type = (p.type || '').toLowerCase();
            const isRep = (p as any).isRepresentative || (p as any).isLegalRepresentative;
            return isRep ||
                role.includes('sócio') || role.includes('socio') ||
                role.includes('administrador') || role.includes('titular') ||
                role.includes('representante') || role.includes('gerente') ||
                role.includes('diretor') || role.includes('proprietário') ||
                role.includes('proprietario') || role.includes('empresário') ||
                role.includes('empresario') ||
                type.includes('sócio') || type.includes('socio') ||
                type.includes('administrador') || type.includes('titular') ||
                type.includes('representante');
        });

        if (!found && companyPartners.length > 0) {
            return companyPartners[0];
        }

        return found;
    })();

    const accountant: any = (() => {
        if (selectedAccountantId) {
            const foundPartner = companyPartners.find(p => p.id === selectedAccountantId);
            if (foundPartner) return foundPartner;
            const foundEmp = companyEmployees.find(e => e.id === selectedAccountantId);
            if (foundEmp) return foundEmp;
        }

        let acc = companyPartners.find(p => {
            const role = (p.role || '').toLowerCase();
            const type = (p.type || '').toLowerCase();
            return role.includes('contador') || role.includes('contabilista') ||
                   type.includes('contador') || type.includes('contabilista');
        });

        if (!acc) {
            acc = companyEmployees.find(e => {
                const pos = (e.position || e.role || '').toLowerCase();
                return pos.includes('contador') || pos.includes('contabilista');
            });
        }

        return acc;
    })();

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '__/__/____';
        const [y, m, d] = dateStr.split('-').map(Number);
        if (!y || !m || !d) return '__/__/____';
        return format(new Date(y, m - 1, d, 12, 0, 0), 'dd/MM/yyyy');
    };

    // Helper for Title Case
    const toTitleCase = (str: string) => {
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    };

    const { addToast } = useToast();

    // Validation Function
    const validateData = () => {
        const errors: string[] = [];

        if (!selectedCompany) {
            errors.push("Empresa não selecionada.");
        } else {
            if (!selectedCompany.razaoSocial) errors.push("Razão Social da empresa ausente.");
            if (!selectedCompany.cnpj) errors.push("CNPJ da empresa ausente.");
            if (!selectedCompany.address?.city) errors.push("Cidade da empresa ausente.");
            if (!selectedCompany.address?.uf) errors.push("UF da empresa ausente.");
        }

        if (!representative) errors.push("Representante Legal não encontrado nos sócios.");
        if (!accountant) errors.push("Contabilista Responsável não encontrado.");

        if (errors.length > 0) {
            errors.forEach(err => addToast(err, 'error'));
            return false;
        }
        return true;
    };

    const generatePDF = (action: 'download' | 'print') => {
        if (!validateData()) return;
        if (!selectedCompany) return; // Typescript guard check again

        const doc = new jsPDF();
        // ... (rest of function)

        // --- PROFESSIONAL LAYOUT CONFIGURATION ---
        doc.setFont('helvetica');

        // Double Border (Classic Book Style)
        doc.setLineWidth(1.5);
        doc.rect(10, 10, 190, 277); // Outer
        doc.setLineWidth(0.5);
        doc.rect(12, 12, 186, 273); // Inner

        // --- HEADER ---
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(`TERMO DE ${termType.toUpperCase()}`, 105, 40, { align: 'center' });

        doc.setLineWidth(1);
        doc.line(70, 45, 140, 45); // Underline title

        doc.setFontSize(16);
        doc.text(`LIVRO DE ${bookType.toUpperCase()}`, 105, 60, { align: 'center' });

        // --- COMPANY DATA BOX ---
        const startY = 80;
        const boxHeight = 65;

        doc.setDrawColor(0);
        doc.setFillColor(248, 249, 250); // Light gray background
        doc.rect(20, startY, 170, boxHeight, 'F');
        doc.setLineWidth(0.5);
        doc.rect(20, startY, 170, boxHeight); // Border

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedCompany.razaoSocial || 'RAZÃO SOCIAL NÃO DEFINIDA', 105, startY + 12, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Address Construction
        const addr = selectedCompany.address;
        const addressLine = addr
            ? `${addr.street}, ${addr.number}${addr.complemento ? ' - ' + addr.complemento : ''} - ${addr.neighborhood}`
            : 'Endereço não cadastrado';
        const cityLine = addr ? `${addr.city} - ${addr.uf} | CEP: ${addr.zip}` : '';

        doc.text(addressLine, 105, startY + 22, { align: 'center' });
        doc.text(cityLine, 105, startY + 27, { align: 'center' });

        // Identifiers (CNPJ, IE, IM, NIRE)
        doc.setFont('helvetica', 'bold');
        const col1X = 50;
        const col2X = 140;
        const row1Y = startY + 40;
        const row2Y = startY + 50;

        // Row 1
        doc.text(`CNPJ: ${selectedCompany.cnpj}`, col1X, row1Y, { align: 'center' });
        doc.text(`NIRE: ${(selectedCompany as any).nire || '________________'}`, col2X, row1Y, { align: 'center' });

        // Row 2
        doc.text(`Insc. Estadual: ${selectedCompany.inscricaoEstadual || selectedCompany.ie || 'Isento'}`, col1X, row2Y, { align: 'center' });
        doc.text(`Insc. Municipal: ${selectedCompany.inscricaoMunicipal || selectedCompany.im || 'Isento'}`, col2X, row2Y, { align: 'center' });


        // --- TEXT BODY ---
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        // Calculate Pages
        const startP = parseInt(initialPage) || 1;
        const totalP = parseInt(totalPages) || 1;
        const endP = startP + totalP - 1;
        const startStr = startP.toString().padStart(3, '0');
        const endStr = endP.toString().padStart(3, '0');

        let textBody = '';
        if (termType === 'Abertura') {
            textBody = `          Este livro, sob número ${bookNumber}, contém ${totalPages} folhas numeradas tipograficamente de ${startStr} a ${endStr}, e servirá para escrituração do LIVRO DE ${bookType.toUpperCase()} da empresa acima identificada, referente ao período de ${formatDate(startDate)} a ${formatDate(endDate)}.`;
        } else {
            textBody = `          Este livro, sob número ${bookNumber}, contém ${totalPages} folhas numeradas tipograficamente de ${startStr} a ${endStr}, e serviu para escrituração do LIVRO DE ${bookType.toUpperCase()} da empresa acima identificada, referente ao período de ${formatDate(startDate)} a ${formatDate(endDate)}.`;
            if (bookType.includes('Inventário')) {
                textBody += `\n\n          Declara-se, para os devidos fins, que o valor total do estoque final apurado nesta data é de R$ ${closingStockValue}.`;
            }
        }

        const splitText = doc.splitTextToSize(textBody, 160);
        doc.text(splitText, 25, 170);

        // --- DATE AND SIGNATURES ---

        // City Title Case
        const rawCity = selectedCompany.address?.city || 'Cidade';
        const formattedCity = toTitleCase(rawCity);
        const dateLine = `${formattedCity}, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;

        doc.text(dateLine, 105, 220, { align: 'center' });

        // Signature Lines
        const sigY = 260;
        doc.setLineWidth(0.5);
        doc.line(30, sigY, 90, sigY); // Left
        doc.line(120, sigY, 180, sigY); // Right

        // Signature Texts
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Representante Legal', 60, sigY + 5, { align: 'center' });
        doc.text('Contabilista Responsável', 150, sigY + 5, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        // Representative Data
        if (representative) {
            doc.text(representative.name.toUpperCase(), 60, sigY + 10, { align: 'center' });
            // Try to find CPF in cpf or cnpj field
            const repCpf = (representative as any).cpf || representative.cnpj || '';
            if (repCpf) doc.text(`CPF: ${repCpf}`, 60, sigY + 14, { align: 'center' });
        }

        // Accountant Data
        if (accountant) {
            doc.text(accountant.name.toUpperCase(), 150, sigY + 10, { align: 'center' });
            const accCpf = (accountant as any).cpf || accountant.cpf || '';
            const accCrc = (accountant as any).rg || (accountant as any).crc || ''; // Assuming RG field might hold CRC or explicit field

            let offset = 14;
            if (accCpf) {
                doc.text(`CPF: ${accCpf}`, 150, sigY + offset, { align: 'center' });
                offset += 4;
            }
            if (accCrc) {
                doc.text(`CRC: ${accCrc}`, 150, sigY + offset, { align: 'center' });
            }
        }

        // Page Number Footer
        const pageDisplay = termType === 'Abertura' ? startP : endP;
        doc.setFontSize(8);
        doc.text(`Página ${pageDisplay}`, 190, 282, { align: 'right' });

        if (action === 'download') {
            doc.save(`termo_${termType.toLowerCase()}_${bookType.toLowerCase().replace(/ /g, '_')}.pdf`);
        } else {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        }
    };

    // Calculate Pages for Preview
    const startP = parseInt(initialPage) || 1;
    const totalP = parseInt(totalPages) || 1;
    const endP = startP + totalP - 1;
    const startStr = startP.toString().padStart(3, '0');
    const endStr = endP.toString().padStart(3, '0');

    return (
        <div className='flex gap-6 flex-col lg:flex-row animate-in fade-in duration-500'>
            <div className="w-full lg:w-1/3 bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)] space-y-4 h-fit">
                <h3 className='font-bold flex items-center gap-2 mb-4'>
                    <BookOpen size={20} className='text-green-600' />
                    Configuração do Termo
                </h3>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tipo de Termo</label>
                    <div className='grid grid-cols-2 gap-2'>
                        <button
                            onClick={() => setTermType('Abertura')}
                            className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all ${termType === 'Abertura' ? 'bg-green-600 text-white border-green-600' : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-green-600'}`}>
                            Abertura
                        </button>
                        <button
                            onClick={() => setTermType('Encerramento')}
                            className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all ${termType === 'Encerramento' ? 'bg-green-600 text-white border-green-600' : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-green-600'}`}>
                            Encerramento
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tipo de Livro</label>
                    <select
                        value={bookType}
                        onChange={(e) => setBookType(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                    >
                        <option value="Entradas">Livro de Entradas</option>
                        <option value="Saídas">Livro de Saídas</option>
                        <option value="Serviços">Livro de Serviços</option>
                        <option value="Apuração ICMS">Apuração do ICMS</option>
                        <option value="Inventário">Inventário de Estoque</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Representante Legal (Sócio)</label>
                    <select
                        value={selectedRepresentativeId || representative?.id || ''}
                        onChange={(e) => setSelectedRepresentativeId(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] font-medium"
                    >
                        {companyPartners.length === 0 ? (
                            <option value="">Nenhum sócio cadastrado para esta empresa</option>
                        ) : (
                            companyPartners.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} {p.role ? `(${p.role})` : ''}
                                </option>
                            ))
                        )}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Contabilista Responsável</label>
                    <select
                        value={selectedAccountantId || accountant?.id || ''}
                        onChange={(e) => setSelectedAccountantId(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] font-medium"
                    >
                        <option value="">Selecione um contabilista...</option>
                        {companyPartners.length > 0 && (
                            <optgroup label="Sócios">
                                {companyPartners.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} {p.role ? `(${p.role})` : ''}</option>
                                ))}
                            </optgroup>
                        )}
                        {companyEmployees.length > 0 && (
                            <optgroup label="Funcionários">
                                {companyEmployees.map(e => (
                                    <option key={e.id} value={e.id}>{e.name} {e.position ? `(${e.position})` : ''}</option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                </div>

                {bookType === 'Inventário' && termType === 'Encerramento' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Valor do Estoque Final (R$)</label>
                        <input
                            type="text"
                            value={closingStockValue}
                            onChange={(e) => setClosingStockValue(e.target.value)}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] font-bold text-green-600"
                            placeholder="0,00"
                        />
                    </div>
                )}

                <div className='grid grid-cols-3 gap-4'>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nº Livro</label>
                        <input
                            type="text"
                            value={bookNumber}
                            onChange={(e) => setBookNumber(e.target.value)}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Pág. Inicial</label>
                        <input
                            type="number"
                            value={initialPage}
                            onChange={(e) => setInitialPage(e.target.value)}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Total Pág.</label>
                        <input
                            type="number"
                            value={totalPages}
                            onChange={(e) => setTotalPages(e.target.value)}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                        />
                    </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Data Inicial</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Data Final</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                        />
                    </div>
                </div>

                <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => generatePDF('print')} className="flex-1">
                        <Printer size={18} className="mr-2" />
                        Imprimir
                    </Button>
                    <Button onClick={() => generatePDF('download')} className="flex-1">
                        <Download size={18} className="mr-2" />
                        Download
                    </Button>
                </div>
            </div>

            <div className="flex-1 bg-white text-black p-8 sm:p-12 rounded-2xl shadow-lg border border-gray-200 min-h-[600px] flex flex-col items-center justify-center relative overflow-hidden" style={{ fontFamily: 'Aptos, sans-serif' }}>
                {/* Preview Overlay Label */}
                <div className="absolute top-4 right-4 bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Pré-visualização
                </div>

                {/* Professional Border CSS for Preview matching PDF */}
                <div className='relative text-center space-y-4 max-w-2xl w-full p-12 border border-black'>
                    {/* Double Border Simulation */}
                    <div className="absolute top-1 left-1 right-1 bottom-1 border border-black pointer-events-none"></div>

                    <h1 className='text-3xl font-bold uppercase tracking-wide pt-4' style={{ fontFamily: 'Aptos, sans-serif' }}>Termo de {termType}</h1>
                    <div className='h-px w-32 bg-black mx-auto my-2'></div>
                    <h2 className='text-xl uppercase font-bold text-gray-700' style={{ fontFamily: 'Aptos, sans-serif' }}>Livro de {bookType}</h2>

                    {/* Company Data Box (Blue/Gray Background) */}
                    <div className='bg-gray-50 p-4 mx-4 my-6 border border-gray-200'>
                        <p className='font-bold text-lg uppercase mb-1'>{selectedCompany?.razaoSocial || 'RAZÃO SOCIAL NÃO DEFINIDA'}</p>

                        <div className='text-sm text-gray-600 mb-3 space-y-0.5'>
                            <p>
                                {selectedCompany?.address?.street}, {selectedCompany?.address?.number} {selectedCompany?.address?.complemento ? `- ${selectedCompany.address.complemento}` : ''} - {selectedCompany?.address?.neighborhood}
                            </p>
                            <p>
                                {selectedCompany?.address?.city} - {selectedCompany?.address?.uf} | CEP: {selectedCompany?.address?.zip}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t border-gray-200">
                            <div>
                                <p><strong>CNPJ:</strong> {selectedCompany?.cnpj}</p>
                                <p><strong>Insc. Estadual:</strong> {selectedCompany?.inscricaoEstadual || selectedCompany?.ie || 'Isento'}</p>
                            </div>
                            <div>
                                <p><strong>NIRE:</strong> {(selectedCompany as any)?.nire || '________________'}</p>
                                <p><strong>Insc. Municipal:</strong> {selectedCompany?.inscricaoMunicipal || selectedCompany?.im || 'Isento'}</p>
                            </div>
                        </div>
                    </div>

                    <div className='text-justify text-lg leading-relaxed space-y-6' style={{ fontFamily: 'Aptos, sans-serif' }}>
                        <p className="indent-12">
                            {termType === 'Abertura'
                                ? `Este livro, sob número ${bookNumber}, contém ${totalPages} folhas numeradas tipograficamente de ${startStr} a ${endStr}, e servirá para escrituração do LIVRO DE ${bookType.toUpperCase()} da empresa acima identificada, referente ao período de ${formatDate(startDate)} a ${formatDate(endDate)}.`
                                : `Este livro, sob número ${bookNumber}, contém ${totalPages} folhas numeradas tipograficamente de ${startStr} a ${endStr}, e serviu para escrituração do LIVRO DE ${bookType.toUpperCase()} da empresa acima identificada, referente ao período de ${formatDate(startDate)} a ${formatDate(endDate)}.`
                            }
                        </p>
                        {bookType === 'Inventário' && termType === 'Encerramento' && (
                            <p className="indent-12 font-bold">
                                Declara-se, para os devidos fins, que o valor total do estoque final apurado nesta data é de R$ {closingStockValue}.
                            </p>
                        )}
                    </div>

                    <div className='pt-8 space-y-8'>
                        <p className='text-center'>
                            {toTitleCase(selectedCompany?.address?.city || 'Cidade')}, {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>

                        <div className='grid grid-cols-2 gap-12 pt-4'>
                            <div className='border-t border-black pt-2 flex flex-col items-center'>
                                <p className='text-sm font-bold uppercase'>Representante Legal</p>
                                {representative && (
                                    <>
                                        <p className='text-xs mt-1 uppercase'>{representative.name}</p>
                                        <p className='text-[10px] text-gray-500'>CPF: {(representative as any).cpf || representative.cnpj}</p>
                                    </>
                                )}
                            </div>
                            <div className='border-t border-black pt-2 flex flex-col items-center'>
                                <p className='text-sm font-bold uppercase'>Contabilista Responsável</p>
                                {accountant && (
                                    <>
                                        <p className='text-xs mt-1 uppercase'>{accountant.name}</p>
                                        <div className='flex gap-2 text-[10px] text-gray-500'>
                                            <span>CPF: {(accountant as any).cpf || accountant.cpf}</span>
                                            <span>CRC: {(accountant as any).rg || (accountant as any).crc}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className='absolute bottom-2 right-12 text-xs'>
                        Página {termType === 'Abertura' ? startP : endP}
                    </div>
                </div>
            </div>
        </div>
    );
};
