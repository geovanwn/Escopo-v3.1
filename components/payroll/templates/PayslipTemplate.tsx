import React from 'react';
import { formatDateBR } from '../../../utils/formatters';

export const PayslipTemplate = ({ data, company, id, label, competence }: any) => {
    const money = (val: number | string) => {
        const num = typeof val === 'string' ? parseFloat(val) : (val || 0);
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const safeCompetence = competence || '01/2024';
    const [month, year] = safeCompetence.includes('/') ? safeCompetence.split('/') : ['01', '2024'];

    let monthName = '';
    try {
        monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    } catch (e) { monthName = 'MES'; }

    const border = '1px solid #c8c8c8';
    const borderDark = '1.5px solid #444';
    const headerBg = '#1e3a5f';
    const accentBg = '#f5f7fa';
    const netBg = '#0d6e2f';

    const baseSalary = data.events?.find((e: any) =>
        e.description?.includes('Salário') || e.description?.includes('Pro-Labore') || e.description?.includes('Pró-Labore')
    )?.value || data.baseSalary || 0;

    const faixaIrrf = () => {
        const irrf = data.events?.find((e: any) => e.description?.includes('IRRF'));
        if (!irrf || !irrf.value) return 'Isento';
        const base = data.baseIRRF || 0;
        if (base <= 2259.20) return 'Isento';
        if (base <= 2826.65) return '7,5%';
        if (base <= 3751.05) return '15%';
        if (base <= 4664.68) return '22,5%';
        return '27,5%';
    };

    const employeeCols = [
        { label: 'CÓDIGO', value: (data.person?.id || '').substring(0, 6), w: '16mm' },
        { label: 'NOME DO FUNCIONÁRIO', value: (data.person?.name || '').toUpperCase(), flex: 1 },
        { label: 'CBO', value: data.person?.cbo || '–', w: '16mm' },
        { label: 'FUNÇÃO / CARGO', value: (data.person?.role || '–').toUpperCase(), w: '34mm' },
        { label: 'DATA ADMISSÃO', value: formatDateBR(data.person?.admissionDate || '') || '–', w: '22mm' },
        { label: 'PIS / NIT', value: data.person?.pis || '–', w: '30mm' },
    ];

    const tableCols = [
        { label: 'CÓD.', w: '13mm', align: 'center' as const },
        { label: 'DESCRIÇÃO', flex: 1, align: 'left' as const },
        { label: 'REFERÊNCIA', w: '22mm', align: 'center' as const },
        { label: 'VENCIMENTOS', w: '28mm', align: 'right' as const },
        { label: 'DESCONTOS', w: '28mm', align: 'right' as const },
    ];

    const baseCols = [
        { label: 'SAL. BASE', value: money(baseSalary) },
        { label: 'SAL. CONTR. INSS', value: money(data.baseINSS) },
        { label: 'BASE FGTS', value: money(data.baseFGTS) },
        { label: 'FGTS MÊS (8%)', value: money(data.fgtsValue) },
        { label: 'BASE IRRF', value: money(data.baseIRRF) },
        { label: 'FAIXA IRRF', value: faixaIrrf() },
    ];

    const events: any[] = data.events || [];
    const emptyRows = Math.max(0, 5 - events.length);

    return (
        <div id={id} style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '8.5px',
            color: '#1a1a1a',
            width: '200mm',
            margin: '0 auto',
            backgroundColor: '#fff',
            padding: '2mm 3mm',
            boxSizing: 'border-box',
            lineHeight: '1.25',
        }}>
            <div style={{ border: borderDark }}>

                {/* ── HEADER ─────────────────────────────────────── */}
                <div style={{ display: 'flex', borderBottom: borderDark }}>
                    <div style={{ flex: 1, padding: '4px 7px' }}
                    >
                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#1a1a1a', marginBottom: '3px' }}>
                            {(company?.razaoSocial || 'NOME DA EMPRESA LTDA').toUpperCase()}
                        </div>
                        <div style={{ fontSize: '8px', color: '#555' }}>
                            {company?.address?.street || ''}{company?.address?.number ? ', ' + company.address.number : ''}
                            {company?.address?.neighborhood ? ' – ' + company.address.neighborhood : ''}
                        </div>
                        <div style={{ fontSize: '8px', color: '#555' }}>
                            {company?.address?.city || 'CIDADE'} – {company?.address?.state || 'UF'}&nbsp;&nbsp;{company?.address?.zip || ''}
                            &nbsp;|&nbsp; CNPJ: {company?.cnpj || '00.000.000/0000-00'}
                        </div>
                    </div>
                    <div style={{ width: '70mm', borderLeft: borderDark, display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                            backgroundColor: headerBg, color: '#fff',
                            padding: '4px 7px', fontSize: '9px', fontWeight: '800',
                            textAlign: 'center', letterSpacing: '0.3px',
                        }}>
                            RECIBO DE PAGAMENTO DE SALÁRIO
                        </div>
                        <div style={{ flex: 1, padding: '3px 7px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                                <div style={{ fontSize: '7px', color: '#888', fontWeight: '700', textTransform: 'uppercase' }}>Referência</div>
                                <div style={{ fontSize: '11px', fontWeight: '900', color: '#1a1a1a', lineHeight: 1 }}>
                                    {monthName}/{year}
                                </div>
                            </div>
                            <div style={{
                                fontSize: '7px', fontWeight: '700', color: '#fff',
                                backgroundColor: label?.includes('2') ? '#5a6978' : '#1e6ec8',
                                padding: '2px 7px', borderRadius: '2px', textAlign: 'center',
                            }}>
                                {label || '1ª VIA – EMPREGADOR'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── EMPLOYEE DATA ───────────────────────────────── */}
                <div style={{ display: 'flex', borderBottom: borderDark, backgroundColor: accentBg }}>
                    {employeeCols.map((col, i) => (
                        <div key={i} style={{
                            width: col.w, flex: col.flex,
                            padding: '4px 6px',
                            borderRight: i < employeeCols.length - 1 ? border : 'none',
                        }}>
                            <div style={{ fontSize: '6.5px', fontWeight: '800', color: '#777', textTransform: 'uppercase', marginBottom: '2px' }}>
                                {col.label}
                            </div>
                            <div style={{ fontSize: '9px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {col.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── TABLE HEADER ────────────────────────────────── */}
                <div style={{ display: 'flex', backgroundColor: headerBg, borderBottom: borderDark }}>
                    {tableCols.map((col, i) => (
                        <div key={i} style={{
                            width: col.w || 'auto', flex: col.flex || 'none', boxSizing: 'border-box',
                            padding: '4px 6px',
                            fontSize: '7.5px', fontWeight: '800', color: '#fff',
                            textAlign: col.align,
                            borderRight: i < tableCols.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                            letterSpacing: '0.2px',
                        }}>
                            {col.label}
                        </div>
                    ))}
                </div>

                {/* ── EVENT ROWS ──────────────────────────────────── */}
                <div style={{ borderBottom: borderDark, minHeight: '30mm' }}>
                    {events.map((evt: any, idx: number) => (
                        <div key={idx} style={{
                            display: 'flex',
                            borderBottom: idx < events.length - 1 ? '1px solid #ebebeb' : 'none',
                            backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb',
                        }}>
                            <div style={{ width: '13mm', flex: 'none', boxSizing: 'border-box', padding: '4px 5px', textAlign: 'center', borderRight: border, color: '#666', fontSize: '8px' }}>
                                {String(evt.code || (idx + 1)).padStart(3, '0')}
                            </div>
                            <div style={{ flex: 1, boxSizing: 'border-box', padding: '4px 7px', borderRight: border, fontSize: '8.5px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {(evt.description || '').toUpperCase()}
                            </div>
                            <div style={{ width: '22mm', flex: 'none', boxSizing: 'border-box', padding: '4px 5px', textAlign: 'center', borderRight: border, fontSize: '8px', color: '#555' }}>
                                {evt.reference || ''}
                            </div>
                            <div style={{ width: '28mm', flex: 'none', boxSizing: 'border-box', padding: '4px 7px', textAlign: 'right', borderRight: border, fontSize: '8.5px', fontWeight: '600', color: '#15803d' }}>
                                {evt.type === 'provento' ? money(evt.value) : ''}
                            </div>
                            <div style={{ width: '28mm', flex: 'none', boxSizing: 'border-box', padding: '4px 7px', textAlign: 'right', fontSize: '8.5px', fontWeight: '600', color: '#c0392b' }}>
                                {evt.type === 'desconto' ? money(evt.value) : ''}
                            </div>
                        </div>
                    ))}
                    {Array.from({ length: emptyRows }).map((_, i) => (
                        <div key={'e' + i} style={{ display: 'flex', height: '12px', borderBottom: i < emptyRows - 1 ? '1px solid #f0f0f0' : 'none', backgroundColor: (events.length + i) % 2 === 0 ? '#fff' : '#f9fafb' }}>
                            <div style={{ width: '13mm', flex: 'none', boxSizing: 'border-box', borderRight: border }} />
                            <div style={{ flex: 1, boxSizing: 'border-box', borderRight: border }} />
                            <div style={{ width: '22mm', flex: 'none', boxSizing: 'border-box', borderRight: border }} />
                            <div style={{ width: '28mm', flex: 'none', boxSizing: 'border-box', borderRight: border }} />
                            <div style={{ width: '28mm', flex: 'none', boxSizing: 'border-box' }} />
                        </div>
                    ))}
                </div>

                {/* ── TOTALS ──────────────────────────────────────── */}
                <div style={{ display: 'flex', borderBottom: borderDark }}>
                    <div style={{ flex: 1, padding: '3px 6px', borderRight: borderDark }}>
                        <div style={{ fontSize: '6.5px', fontWeight: '800', color: '#777', textTransform: 'uppercase', marginBottom: '3px' }}>
                            MENSAGEM AO COLABORADOR
                        </div>
                        <div style={{ fontSize: '8px', color: '#444', fontStyle: 'italic' }}>&nbsp;</div>
                    </div>
                    <div style={{ width: '70mm', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', flex: 1, borderBottom: border }}>
                            <div style={{ flex: 1, padding: '4px 8px', borderRight: border, textAlign: 'right' }}>
                                <div style={{ fontSize: '6.5px', fontWeight: '800', color: '#777', textTransform: 'uppercase' }}>TOTAL VENCIMENTOS</div>
                                <div style={{ fontSize: '10px', fontWeight: '800', color: '#15803d' }}>{money(data.totalProventos)}</div>
                            </div>
                            <div style={{ flex: 1, padding: '4px 8px', textAlign: 'right' }}>
                                <div style={{ fontSize: '6.5px', fontWeight: '800', color: '#777', textTransform: 'uppercase' }}>TOTAL DESCONTOS</div>
                                <div style={{ fontSize: '10px', fontWeight: '800', color: '#c0392b' }}>{money(data.totalDescontos)}</div>
                            </div>
                        </div>
                        <div style={{
                            backgroundColor: netBg,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '4px 8px',
                        }}>
                            <div style={{ fontSize: '8.5px', fontWeight: '800', color: '#fff', letterSpacing: '0.3px' }}>VALOR LÍQUIDO {'>'}{'>'}</div>
                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>
                                {money(data.netSalary)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── BASE VALUES ─────────────────────────────────── */}
                <div style={{ display: 'flex', borderBottom: borderDark, backgroundColor: accentBg }}>
                    {baseCols.map((col, i) => (
                        <div key={i} style={{
                            flex: 1, padding: '3px 6px',
                            borderRight: i < baseCols.length - 1 ? border : 'none',
                        }}>
                            <div style={{ fontSize: '6px', fontWeight: '800', color: '#777', textTransform: 'uppercase', marginBottom: '2px' }}>
                                {col.label}
                            </div>
                            <div style={{ fontSize: '8.5px', fontWeight: '700' }}>{col.value}</div>
                        </div>
                    ))}
                </div>

                {/* ── SIGNATURES ──────────────────────────────────── */}
                <div style={{ padding: '5px 8px 4px' }}>
                    <div style={{ fontSize: '7px', fontStyle: 'italic', color: '#555', marginBottom: '7px' }}>
                        Declaro ter recebido a importância líquida discriminada neste recibo.
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                        <div style={{ width: '70px' }}>
                            <div style={{ borderBottom: '1px solid #333', height: '14px', marginBottom: '2px' }} />
                            <div style={{ fontSize: '6px', textAlign: 'center', color: '#666', fontWeight: '700', letterSpacing: '0.3px' }}>DATA</div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ borderBottom: '1px solid #333', height: '14px', marginBottom: '2px' }} />
                            <div style={{ fontSize: '6px', textAlign: 'center', color: '#666', fontWeight: '700', letterSpacing: '0.3px' }}>ASSINATURA DO FUNCIONÁRIO</div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ borderBottom: '1px solid #333', height: '14px', marginBottom: '2px' }} />
                            <div style={{ fontSize: '6px', textAlign: 'center', color: '#666', fontWeight: '700', letterSpacing: '0.3px' }}>RESPONSÁVEL / RH</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legal */}
            <div style={{ fontSize: '6.5px', marginTop: '3px', textAlign: 'center', color: '#aaa', letterSpacing: '0.2px' }}>
                Documento emitido conforme Art. 464 da CLT. Autenticidade verificável nos registros da empresa. | Emissão: {new Date().toLocaleDateString('pt-BR')}
            </div>
        </div>
    );
};
