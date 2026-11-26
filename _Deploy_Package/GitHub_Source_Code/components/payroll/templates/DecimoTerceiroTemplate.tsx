import React from 'react';
import { formatDateBR } from '../../../utils/formatters';

export const DecimoTerceiroTemplate = ({ data, company, id, label, inputs, competence }: any) => {
    const money = (val: number | string) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return num ? num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
    };

    const safeCompetence = competence || formatDateBR(new Date().toISOString()).substring(3);
    const [month, year] = safeCompetence.includes('/') ? safeCompetence.split('/') : ['12', '2024'];

    const borderStyle = "1px solid #d97706"; // Amber border for 13th

    return (
        <div id={id} className="bg-white text-gray-900 font-sans text-xs w-[210mm] mx-auto p-4 box-border leading-tight" style={{ width: '210mm', height: '140mm' }}>
            <div style={{ border: borderStyle, height: '130mm', position: 'relative', display: 'flex' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* HEADER - Amber Theme */}
                    <div style={{ height: '26mm', borderBottom: borderStyle, display: 'flex', backgroundColor: '#fffbeb' }}>
                        <div style={{ flex: 1, padding: '6px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{company?.razaoSocial || 'NOME DA EMPRESA LTDA'}</div>
                            <div style={{ fontSize: '9px', marginTop: '2px' }}>{company?.address?.street || 'Rua Exemplo, 123'}</div>
                            <div style={{ fontSize: '9px' }}>CNPJ: {company?.cnpj || '00.000.000/0000-00'}</div>
                        </div>
                        <div style={{ width: '90mm', padding: '6px', borderLeft: borderStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'right', color: '#d97706' }}>RECIBO DE 13º SALÁRIO</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                                <div>
                                    <div style={{ fontSize: '8px', textTransform: 'uppercase' }}>Referência</div>
                                    <div style={{ fontWeight: 'bold' }}>{year}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '8px', textTransform: 'uppercase' }}>Parcela</div>
                                    <div style={{ fontWeight: 'bold' }}>{inputs?.decimoTerceiroParcela === 'unica' ? 'ÚNICA' : `${inputs?.decimoTerceiroParcela}ª PARCELA`}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* EMPLOYEE INFO */}
                    <div style={{ height: '12mm', borderBottom: borderStyle, display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '18mm', height: '100%', padding: '4px', borderRight: borderStyle }}>
                            <div style={{ fontSize: '7px', fontWeight: 'bold' }}>CÓDIGO</div>
                            <div style={{ fontWeight: 'bold' }}>{data.person.id.substr(0, 4)}</div>
                        </div>
                        <div style={{ flex: 1, height: '100%', padding: '4px', borderRight: borderStyle }}>
                            <div style={{ fontSize: '7px', fontWeight: 'bold' }}>NOME</div>
                            <div style={{ fontWeight: 'bold' }}>{data.person.name.toUpperCase()}</div>
                        </div>
                        <div style={{ width: '30mm', height: '100%', padding: '4px', borderRight: borderStyle }}>
                            <div style={{ fontSize: '7px', fontWeight: 'bold' }}>FUNÇÃO</div>
                            <div>{data.person.role.toUpperCase()}</div>
                        </div>
                        <div style={{ width: '22mm', height: '100%', padding: '4px' }}>
                            <div style={{ fontSize: '6px', fontWeight: 'bold' }}>ADMISSÃO</div>
                            <div>{formatDateBR(data.person.admissionDate)}</div>
                        </div>
                    </div>

                    {/* EVENTS GRID */}
                    <div style={{ flex: 1, borderBottom: borderStyle, position: 'relative' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <thead style={{ backgroundColor: '#fffbeb' }}>
                                <tr style={{ height: '20px', borderBottom: borderStyle }}>
                                    <th style={{ width: '14mm', fontSize: '8px', borderRight: borderStyle, textAlign: 'center', color: '#B45309' }}>CÓD.</th>
                                    <th style={{ textAlign: 'left', paddingLeft: '8px', fontSize: '8px', borderRight: borderStyle, color: '#B45309' }}>DESCRIÇÃO</th>
                                    <th style={{ width: '18mm', fontSize: '8px', borderRight: borderStyle, textAlign: 'center', color: '#B45309' }}>REF.</th>
                                    <th style={{ width: '26mm', fontSize: '8px', borderRight: borderStyle, textAlign: 'right', paddingRight: '4px', color: '#B45309' }}>VENCIMENTOS</th>
                                    <th style={{ width: '26mm', fontSize: '8px', textAlign: 'right', paddingRight: '4px', color: '#B45309' }}>DESCONTOS</th>
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
                    <div style={{ height: '30mm' }}>
                        <div style={{ display: 'flex', height: '20mm', borderBottom: borderStyle }}>
                            <div style={{ flex: 1, padding: '4px', borderRight: borderStyle }}>
                                <div style={{ fontSize: '7px', fontWeight: 'bold' }}>MENSAGEM</div>
                                <div style={{ fontSize: '8px', marginTop: '4px', fontStyle: 'italic' }}>
                                    Gratificação Natalina - {year}<br />
                                    Mantenha este recibo para fins de comprovação.
                                </div>
                            </div>
                            <div style={{ width: '80mm', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ flex: 1, display: 'flex', borderBottom: borderStyle }}>
                                    <div style={{ flex: 1, padding: '4px', borderRight: borderStyle, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                                        <div style={{ fontSize: '6px', fontWeight: 'bold' }}>TOTAL PROVENTOS</div>
                                        <div style={{ fontWeight: 'bold' }}>{money(data.totalProventos)}</div>
                                    </div>
                                    <div style={{ flex: 1, padding: '4px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                                        <div style={{ fontSize: '6px', fontWeight: 'bold' }}>TOTAL DESCONTOS</div>
                                        <div style={{ fontWeight: 'bold' }}>{money(data.totalDescontos)}</div>
                                    </div>
                                </div>
                                <div style={{ height: '10mm', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#d97706' }}>LÍQUIDO A RECEBER &#10140;</div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{money(data.netSalary)}</div>
                                </div>
                            </div>
                        </div>
                        <div style={{ height: '10mm', display: 'flex', borderBottom: borderStyle }}>
                            <div style={{ flex: 1, padding: '2px 4px', borderRight: '1px solid #ccc' }}>
                                <div style={{ fontSize: '6px', fontWeight: 'bold' }}>BASE CALC. FGTS</div>
                                <div style={{ fontSize: '9px' }}>{money(data.fgtsVal / 0.08 || 0)}</div>
                            </div>
                            <div style={{ flex: 1, padding: '2px 4px', borderRight: '1px solid #ccc' }}>
                                <div style={{ fontSize: '6px', fontWeight: 'bold' }}>FGTS MÊS</div>
                                <div style={{ fontSize: '9px' }}>{money(data.fgtsVal)}</div>
                            </div>
                            <div style={{ flex: 1, padding: '2px 4px', borderRight: '1px solid #ccc' }}>
                                <div style={{ fontSize: '6px', fontWeight: 'bold' }}>BASE CALC. IRRF</div>
                                <div style={{ fontSize: '9px' }}>{money(data.baseIRRF)}</div>
                            </div>
                            <div style={{ flex: 1, padding: '2px 4px' }}>
                                <div style={{ fontSize: '6px', fontWeight: 'bold' }}>BASE CALC. INSS</div>
                                <div style={{ fontSize: '9px' }}>{money(data.baseINSS)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
