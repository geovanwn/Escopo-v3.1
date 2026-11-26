import React from 'react';
import { formatDateBR, parseDateSafe } from '../../../utils/formatters';

export const FeriasTemplate = ({ data, company, id, label, inputs, competence }: any) => {
    const money = (val: number | string) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return num ? num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
    };
    const date = (d: string) => formatDateBR(d);

    const safeCompetence = competence || formatDateBR(new Date().toISOString()).substring(3);
    const [month, year] = safeCompetence.includes('/') ? safeCompetence.split('/') : ['01', '2024'];

    const borderStyle = "1px solid #2563eb"; // Blue border for Vacation

    return (
        <div id={id} className="bg-white text-gray-900 font-sans text-xs w-[210mm] mx-auto p-4 box-border leading-tight" style={{ width: '210mm', height: '140mm' }}>
            <div style={{ border: borderStyle, height: '130mm', position: 'relative', display: 'flex' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* HEADER - Blue Theme */}
                    <div style={{ height: '26mm', borderBottom: borderStyle, display: 'flex', backgroundColor: '#eff6ff' }}>
                        <div style={{ flex: 1, padding: '6px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{company?.razaoSocial || 'NOME DA EMPRESA LTDA'}</div>
                            <div style={{ fontSize: '9px', marginTop: '2px' }}>{company?.address?.street || 'Endereço da Empresa'}</div>
                            <div style={{ fontSize: '9px' }}>CNPJ: {company?.cnpj || '00.000.000/0000-00'}</div>
                        </div>
                        <div style={{ width: '80mm', padding: '6px', borderLeft: borderStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', textAlign: 'right', color: '#2563eb' }}>RECIBO DE FÉRIAS</div>
                            <div style={{ fontSize: '9px', textAlign: 'right', marginTop: '4px' }}>Art. 145 da CLT</div>
                        </div>
                    </div>

                    {/* PERIODS */}
                    <div style={{ height: '12mm', borderBottom: borderStyle, display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                        <div style={{ flex: 1, padding: '4px', borderRight: borderStyle }}>
                            <div style={{ fontSize: '6px', fontWeight: 'bold', color: '#64748b' }}>PERÍODO AQUISITIVO</div>
                            <div style={{ fontWeight: 'bold' }}>01/01/{parseInt(year) - 1} a 31/12/{parseInt(year) - 1}</div>
                        </div>
                        <div style={{ flex: 1, padding: '4px', borderRight: borderStyle }}>
                            <div style={{ fontSize: '6px', fontWeight: 'bold', color: '#64748b' }}>PERÍODO DE GOZO</div>
                            <div style={{ fontWeight: 'bold' }}>{inputs?.vacationStart ? date(inputs.vacationStart) : 'DD/MM/AAAA'} a {inputs?.vacationStart ? formatDateBR(new Date(parseDateSafe(inputs.vacationStart).getTime() + ((inputs.vacationDays || 30) * 86400000)).toISOString()) : 'DD/MM/AAAA'}</div>
                        </div>
                        <div style={{ width: '20mm', padding: '4px' }}>
                            <div style={{ fontSize: '6px', fontWeight: 'bold', color: '#64748b' }}>DIAS</div>
                            <div style={{ fontWeight: 'bold' }}>{inputs?.vacationDays || 30}</div>
                        </div>
                    </div>

                    {/* EMPLOYEE INFO */}
                    <div style={{ height: '10mm', borderBottom: borderStyle, display: 'flex', alignItems: 'center' }}>
                        <div style={{ flex: 1, padding: '4px', borderRight: borderStyle }}>
                            <div style={{ fontSize: '7px', fontWeight: 'bold' }}>FUNCIONÁRIO</div>
                            <div style={{ fontWeight: 'bold' }}>{data.person.name.toUpperCase()}</div>
                        </div>
                        <div style={{ width: '30mm', padding: '4px' }}>
                            <div style={{ fontSize: '7px', fontWeight: 'bold' }}>DATA PAGAMENTO</div>
                            <div>{inputs?.vacationStart ? formatDateBR(new Date(parseDateSafe(inputs.vacationStart).getTime() - (2 * 86400000)).toISOString()) : '-'}</div>
                        </div>
                    </div>

                    {/* EVENTS GRID */}
                    <div style={{ flex: 1, borderBottom: borderStyle, position: 'relative' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <thead style={{ backgroundColor: '#eff6ff' }}>
                                <tr style={{ height: '20px', borderBottom: borderStyle }}>
                                    <th style={{ width: '14mm', fontSize: '8px', borderRight: borderStyle, textAlign: 'center', color: '#1e40af' }}>CÓD.</th>
                                    <th style={{ textAlign: 'left', paddingLeft: '8px', fontSize: '8px', borderRight: borderStyle, color: '#1e40af' }}>DESCRIÇÃO</th>
                                    <th style={{ width: '18mm', fontSize: '8px', borderRight: borderStyle, textAlign: 'center', color: '#1e40af' }}>REF.</th>
                                    <th style={{ width: '26mm', fontSize: '8px', borderRight: borderStyle, textAlign: 'right', paddingRight: '4px', color: '#1e40af' }}>PROVENTOS</th>
                                    <th style={{ width: '26mm', fontSize: '8px', textAlign: 'right', paddingRight: '4px', color: '#1e40af' }}>DESCONTOS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.events.map((evt: any, idx: number) => (
                                    <tr key={idx} style={{ height: '18px', fontSize: '9px' }}>
                                        <td style={{ textAlign: 'center', color: '#666' }}>{(idx + 1).toString().padStart(3, '0')}</td>
                                        <td style={{ paddingLeft: '8px' }}>{evt.description.toUpperCase()}</td>
                                        <td style={{ textAlign: 'center' }}>{evt.reference}</td>
                                        <td style={{ textAlign: 'right', paddingRight: '4px' }}>{evt.type === 'provento' ? money(evt.value) : ''}</td>
                                        <td style={{ textAlign: 'right', paddingRight: '4px' }}>{evt.type === 'desconto' ? money(evt.value) : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* FOOTER */}
                    <div style={{ height: '25mm', display: 'flex', borderBottom: borderStyle }}>
                        <div style={{ flex: 1, padding: '4px', borderRight: borderStyle, fontSize: '8px' }}>
                            Declaro ter recebido a importância líquida discriminada neste recibo, correspondente às férias a que tenho direito.
                        </div>
                        <div style={{ width: '80mm', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, display: 'flex', borderBottom: borderStyle }}>
                                <div style={{ flex: 1, padding: '4px', borderRight: borderStyle, textAlign: 'right' }}>
                                    <div style={{ fontSize: '6px', fontWeight: 'bold' }}>TOTAL PROVENTOS</div>
                                    <div style={{ fontWeight: 'bold' }}>{money(data.totalProventos)}</div>
                                </div>
                                <div style={{ flex: 1, padding: '4px', textAlign: 'right' }}>
                                    <div style={{ fontSize: '6px', fontWeight: 'bold' }}>TOTAL DESCONTOS</div>
                                    <div style={{ fontWeight: 'bold' }}>{money(data.totalDescontos)}</div>
                                </div>
                            </div>
                            <div style={{ height: '10mm', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
                                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#1e40af' }}>LÍQUIDO A RECEBER &#10140;</div>
                                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{money(data.netSalary)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
