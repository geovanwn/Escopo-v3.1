import React from 'react';
import { formatDateBR } from '../../../utils/formatters';

export const PayslipTemplate = ({ data, company, id, label, competence }: any) => {
    // Helper
    const money = (val: number | string) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return num ? num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
    };

    // Competence processing (handle missing or invalid competence)
    const safeCompetence = competence || formatDateBR(new Date().toISOString()).substring(3);
    const [month, year] = safeCompetence.includes('/') ? safeCompetence.split('/') : ['01', '2024'];

    let monthName = '';
    try {
        monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    } catch (e) {
        monthName = 'MÊS';
    }

    // Inline styles for printing reliability
    const borderStyle = "1px solid #333";

    return (
        <div id={id} className="bg-white text-gray-900 font-sans text-xs w-[210mm] mx-auto p-4 box-border leading-tight" style={{ width: '210mm', height: '140mm' }}>

            {/* CONTAINER COM BORDA */}
            <div style={{ border: borderStyle, height: '130mm', position: 'relative', display: 'flex' }}>

                {/* ESQUERDA - CONTEUDO PRINCIPAL */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                    {/* 1. CABEÇALHO */}
                    <div style={{ height: '26mm', borderBottom: borderStyle, display: 'flex' }}>
                        {/* EMPRESA */}
                        <div style={{ flex: 1, padding: '6px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{company?.razaoSocial || 'NOME DA EMPRESA LTDA'}</div>
                            <div style={{ fontSize: '9px', marginTop: '2px' }}>{company?.address?.street || 'Rua Exemplo, 123'} - {company?.address?.neighborhood || 'Bairro'}</div>
                            <div style={{ fontSize: '9px' }}>{company?.address?.city || 'Cidade'} - {company?.address?.state || 'UF'}, {company?.address?.zip || '00000-000'} | CNPJ: {company?.cnpj || '00.000.000/0000-00'}</div>
                        </div>

                        {/* RECIBO */}
                        <div style={{ width: '80mm', padding: '6px', borderLeft: borderStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '11px', textAlign: 'right' }}>RECIBO DE PAGAMENTO DE SALÁRIO</div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                                <div>
                                    <div style={{ fontSize: '8px', textTransform: 'uppercase' }}>Referência</div>
                                    <div style={{ fontWeight: 'bold' }}>{monthName}/{year}</div>
                                </div>
                                <div style={{ fontSize: '9px', textAlign: 'right', color: '#666' }}>{label}</div>
                            </div>
                        </div>
                    </div>

                    {/* 2. FUNCIONARIO */}
                    <div style={{ height: '12mm', borderBottom: borderStyle, display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '18mm', height: '100%', padding: '4px', borderRight: borderStyle }}>
                            <div style={{ fontSize: '7px', fontWeight: 'bold' }}>CÓDIGO</div>
                            <div style={{ fontWeight: 'bold' }}>{data.person.id.substr(0, 4)}</div>
                        </div>
                        <div style={{ flex: 1, height: '100%', padding: '4px', borderRight: borderStyle }}>
                            <div style={{ fontSize: '7px', fontWeight: 'bold' }}>NOME DO FUNCIONÁRIO</div>
                            <div style={{ fontWeight: 'bold' }}>{data.person.name.toUpperCase()}</div>
                        </div>
                        <div style={{ width: '20mm', height: '100%', padding: '4px', borderRight: borderStyle }}>
                            <div style={{ fontSize: '7px', fontWeight: 'bold' }}>CBO</div>
                            <div>{data.person.cbo || '-'}</div>
                        </div>
                        <div style={{ width: '30mm', height: '100%', padding: '4px', borderRight: borderStyle }}>
                            <div style={{ fontSize: '7px', fontWeight: 'bold' }}>FUNÇÃO</div>
                            <div>{data.person.role.toUpperCase()}</div>
                        </div>
                        <div style={{ width: '22mm', height: '100%', padding: '4px', borderRight: borderStyle }}>
                            <div style={{ fontSize: '6px', fontWeight: 'bold' }}>DATA ADMISSÃO</div>
                            <div>{formatDateBR(data.person.admissionDate)}</div>
                        </div>
                        <div style={{ width: '25mm', height: '100%', padding: '4px' }}>
                            <div style={{ fontSize: '7px', fontWeight: 'bold' }}>PIS/NIT</div>
                            <div>{data.person.pis || '-'}</div>
                        </div>
                    </div>

                    {/* 3. CORPO - GRID DE RUBRICAS (USANDO TABLE PARA ALINHAMENTO PERFEITO) */}
                    <div style={{ flex: 1, borderBottom: borderStyle, position: 'relative' }}>
                        <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <thead style={{ backgroundColor: '#f3f4f6', height: '20px' }}>
                                <tr style={{ borderBottom: borderStyle }}>
                                    <th style={{ width: '14mm', fontSize: '8px', borderRight: borderStyle, textAlign: 'center', fontWeight: 'bold' }}>CÓD.</th>
                                    <th style={{ textAlign: 'left', paddingLeft: '8px', fontSize: '8px', borderRight: borderStyle, fontWeight: 'bold' }}>DESCRIÇÃO</th>
                                    <th style={{ width: '18mm', fontSize: '8px', borderRight: borderStyle, textAlign: 'center', fontWeight: 'bold' }}>REF.</th>
                                    <th style={{ width: '26mm', fontSize: '8px', borderRight: borderStyle, textAlign: 'right', paddingRight: '4px', fontWeight: 'bold' }}>VENCIMENTOS</th>
                                    <th style={{ width: '26mm', fontSize: '8px', textAlign: 'right', paddingRight: '4px', fontWeight: 'bold' }}>DESCONTOS</th>
                                </tr>
                            </thead>
                            <tbody style={{ verticalAlign: 'top' }}>
                                {data.events.map((evt: any, idx: number) => (
                                    <tr key={idx} style={{ height: '18px', fontSize: '9px' }}>
                                        <td style={{ textAlign: 'center', color: '#000', borderRight: borderStyle }}>{(idx + 1).toString().padStart(3, '0')}</td>
                                        <td style={{ paddingLeft: '8px', borderRight: borderStyle }}>{evt.description.toUpperCase()}</td>
                                        <td style={{ textAlign: 'center', borderRight: borderStyle }}>{evt.reference}</td>
                                        <td style={{ textAlign: 'right', paddingRight: '4px', borderRight: borderStyle }}>{evt.type === 'provento' ? money(evt.value) : ''}</td>
                                        <td style={{ textAlign: 'right', paddingRight: '4px' }}>{evt.type === 'desconto' ? money(evt.value) : ''}</td>
                                    </tr>
                                ))}
                                {/* Linha de preenchimento para manter as grades até o final */}
                                <tr>
                                    <td style={{ borderRight: borderStyle }}></td>
                                    <td style={{ borderRight: borderStyle }}></td>
                                    <td style={{ borderRight: borderStyle }}></td>
                                    <td style={{ borderRight: borderStyle }}></td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* 4. RODAPÉ */}
                    <div style={{ height: 'auto', borderBottom: borderStyle }}>
                        <div style={{ display: 'flex', height: '18mm', borderBottom: borderStyle }}>
                            {/* MENSAGEM */}
                            <div style={{ flex: 1, padding: '4px', borderRight: borderStyle }}>
                                <div style={{ fontSize: '7px', fontWeight: 'bold' }}>MENSAGEM AO COLABORADOR</div>
                                <div style={{ fontSize: '8px', marginTop: '4px' }}>
                                    {/* Espaço para mensagens variáveis ou observações */}
                                </div>
                            </div>
                            {/* TOTAIS */}
                            <div style={{ width: '80mm', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ flex: 1, display: 'flex', borderBottom: borderStyle }}>
                                    <div style={{ flex: 1, padding: '4px', borderRight: borderStyle, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                                        <div style={{ fontSize: '6px', fontWeight: 'bold' }}>TOTAL VENCIMENTOS</div>
                                        <div style={{ fontWeight: 'bold' }}>{money(data.totalProventos)}</div>
                                    </div>
                                    <div style={{ flex: 1, padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                                        <div style={{ fontSize: '6px', fontWeight: 'bold' }}>TOTAL DESCONTOS</div>
                                        <div style={{ fontWeight: 'bold' }}>{money(data.totalDescontos)}</div>
                                    </div>
                                </div>
                                <div style={{ height: '8mm', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>VALOR LÍQUIDO &#10140;</div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{money(data.netSalary)}</div>
                                </div>
                            </div>
                        </div>
                        {/* BASES */}
                        <div style={{ height: '10mm', display: 'flex', borderBottom: borderStyle }}>
                            <div style={{ flex: 1, padding: '2px 4px', borderRight: borderStyle }}>
                                <div style={{ fontSize: '6px', fontWeight: 'bold' }}>SAL. BASE</div>
                                <div style={{ fontSize: '9px' }}>{money(data.events.find((e: any) => e.description.includes('Salário'))?.value || data.proLaboreOverride || 0)}</div>
                            </div>
                            <div style={{ flex: 1, padding: '2px 4px', borderRight: borderStyle }}>
                                <div style={{ fontSize: '6px', fontWeight: 'bold' }}>SAL. CONTR. INSS</div>
                                <div style={{ fontSize: '9px' }}>{money(data.baseINSS)}</div>
                            </div>
                            <div style={{ flex: 1, padding: '2px 4px', borderRight: borderStyle }}>
                                <div style={{ fontSize: '6px', fontWeight: 'bold' }}>BASE FGTS</div>
                                <div style={{ fontSize: '9px' }}>{money(data.fgtsVal / 0.08)}</div>
                            </div>
                            <div style={{ flex: 1, padding: '2px 4px', borderRight: borderStyle }}>
                                <div style={{ fontSize: '6px', fontWeight: 'bold' }}>FGTS MÊS</div>
                                <div style={{ fontSize: '9px' }}>{money(data.fgtsVal)}</div>
                            </div>
                            <div style={{ flex: 1, padding: '2px 4px', borderRight: borderStyle }}>
                                <div style={{ fontSize: '6px', fontWeight: 'bold' }}>BASE IRRF</div>
                                <div style={{ fontSize: '9px' }}>{money(data.baseIRRF)}</div>
                            </div>
                            <div style={{ width: '15mm', padding: '2px 4px' }}>
                                <div style={{ fontSize: '6px', fontWeight: 'bold' }}>FAIXA IRRF</div>
                                <div style={{ fontSize: '9px' }}>{data.events.some((e: any) => e.description === 'IRRF') ? '27.5%' : '0%'}</div>
                            </div>
                        </div>

                        {/* ASSINATURAS E DECLARAÇÃO */}
                        <div style={{ height: '24mm', padding: '4px', display: 'flex', alignItems: 'center' }}>
                            <div style={{ flex: 1, paddingRight: '20px' }}>
                                <div style={{ fontSize: '8px', fontStyle: 'italic', marginBottom: '12px' }}>
                                    DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO.
                                </div>
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginTop: '10px' }}>
                                    <div style={{ width: '30%' }}>
                                        <div style={{ borderBottom: '1px solid #000', marginBottom: '2px', minHeight: '14px' }}></div>
                                        <div style={{ textAlign: 'center', fontSize: '6px' }}>DATA</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ borderBottom: '1px solid #000', marginBottom: '2px', minHeight: '14px' }}></div>
                                        <div style={{ textAlign: 'center', fontSize: '6px' }}>ASSINATURA DO FUNCIONÁRIO</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            {/* EMBASAMENTO LEGAL - FORA DO QUADRO */}
            <div style={{ fontSize: '7px', marginTop: '2px', textAlign: 'center', color: '#666' }}>
                Documento emitido conforme Art. 464 da CLT. A autenticidade deste recibo pode ser verificada nos registros da empresa.
            </div>
        </div>
    );
};
