import React from 'react';
import { formatDateBR } from '../../../utils/formatters';

export const TRCTTemplate = ({ data, company, inputs }: { data: any, company: any, inputs?: any }) => {
    const money = (val: number | string) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return num ? num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
    };
    const date = (d: string) => formatDateBR(d);

    // Group events by type for TRCT sections
    const earnings = data.events?.filter((e: any) => e.type === 'provento') || [];
    const deductions = data.events?.filter((e: any) => e.type === 'desconto') || [];

    return (
        <div className="w-[210mm] bg-white text-black p-6 font-sans text-[9px] leading-tight mx-auto border border-gray-300 shadow-lg print:shadow-none print:border-0">
            <div className="border border-black mb-1 text-center font-bold text-[11px] bg-gray-100 p-1">
                TERMO DE RESCISÃO DO CONTRATO DE TRABALHO
            </div>

            {/* 1. EMPREGADOR */}
            <div className="border border-black border-t-0 mb-1">
                <div className="bg-gray-100 border-b border-black px-1 font-bold text-[8px]">1. IDENTIFICAÇÃO DO EMPREGADOR</div>
                <div className="p-1 flex gap-4">
                    <div className="flex-1">
                        <div className="text-[7px] text-gray-500 uppercase">01 CNPJ/CEI</div>
                        <div className="font-bold">{company?.cnpj || '00.000.000/0000-00'}</div>
                    </div>
                    <div className="flex-[3]">
                        <div className="text-[7px] text-gray-500 uppercase">02 Razão Social</div>
                        <div className="font-bold">{company?.razaoSocial?.toUpperCase() || 'EMPRESA DEMO LTDA'}</div>
                    </div>
                </div>
                <div className="border-t border-black p-1">
                    <div className="text-[7px] text-gray-500 uppercase">03 Endereço</div>
                    <div>{company?.address?.street}, {company?.address?.number} - {company?.address?.neighborhood} - {company?.address?.city}/{company?.address?.uf}</div>
                </div>
            </div>

            {/* 2. TRABALHADOR */}
            <div className="border border-black border-t-0 mb-1">
                <div className="bg-gray-100 border-b border-black px-1 font-bold text-[8px]">2. IDENTIFICAÇÃO DO TRABALHADOR</div>
                <div className="p-1 grid grid-cols-4 gap-y-1 gap-x-2">
                    <div className="col-span-1">
                        <div className="text-[7px] text-gray-500 uppercase">20 CPF</div>
                        <div className="font-bold">{data.person.cpf}</div>
                    </div>
                    <div className="col-span-3">
                        <div className="text-[7px] text-gray-500 uppercase">21 Nome</div>
                        <div className="font-bold">{data.person.name.toUpperCase()}</div>
                    </div>
                    <div className="col-span-4 border-t border-dotted border-gray-400 my-0.5"></div>
                    <div>
                        <div className="text-[7px] text-gray-500 uppercase">22 PIS/PASEP</div>
                        <div>{data.person.pis || 'N/A'}</div>
                    </div>
                    <div className="col-span-2">
                        <div className="text-[7px] text-gray-500 uppercase">23 Nome da Mãe</div>
                        <div>{data.person.motherName || '-'}</div>
                    </div>
                </div>
            </div>

            {/* 3. CONTRATO */}
            <div className="border border-black border-t-0 mb-1">
                <div className="bg-gray-100 border-b border-black px-1 font-bold text-[8px]">3. DADOS DO CONTRATO</div>
                <div className="p-1 grid grid-cols-5 gap-y-1 gap-x-2">
                    <div>
                        <div className="text-[7px] text-gray-500 uppercase">24 Tipo Contrato</div>
                        <div>Indeterminado</div>
                    </div>
                    <div>
                        <div className="text-[7px] text-gray-500 uppercase">25 Causa Afastamento</div>
                        <div>{data.rescisaoReasonLabel || 'Dispensa s/ Justa Causa'}</div>
                    </div>
                    <div>
                        <div className="text-[7px] text-gray-500 uppercase">26 Data Admissão</div>
                        <div className="font-bold">{date(data.person.admissionDate)}</div>
                    </div>
                    <div>
                        <div className="text-[7px] text-gray-500 uppercase">27 Data Afastamento</div>
                        <div className="font-bold">{date(data.rescisaoDate) || formatDateBR(new Date().toISOString())}</div>
                    </div>
                    <div>
                        <div className="text-[7px] text-gray-500 uppercase">28 Cód. Afastamento</div>
                        <div className="font-bold">{data.rescisaoAfastamentoCode || 'SJ2'}</div>
                    </div>
                </div>
                <div className="border-t border-black p-1 grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-[7px] text-gray-500 uppercase">29 Categoria</div>
                        <div>Empregado</div>
                    </div>
                    <div>
                        <div className="text-[7px] text-gray-500 uppercase">30 CBO</div>
                        <div>{data.person.cbo || '0000-00'} - {data.person.role.toUpperCase()}</div>
                    </div>
                </div>
            </div>

            {/* 4. VERBAS RESCISÓRIAS */}
            <div className="border border-black border-t-0 mb-1">
                <div className="bg-gray-100 border-b border-black px-1 font-bold text-[8px] flex justify-between">
                    <span>4. DISCRIMINAÇÃO DAS VERBAS RESCISÓRIAS</span>
                </div>

                {/* HEADERS */}
                <div className="flex border-b border-black font-bold text-[7px] bg-gray-50">
                    <div className="w-10 p-1 border-r border-black text-center">RUBRICA</div>
                    <div className="flex-1 p-1 border-r border-black">DESCRIÇÃO</div>
                    <div className="w-16 p-1 border-r border-black text-center">REF</div>
                    <div className="w-20 p-1 border-r border-black text-right">VENCIMENTO</div>
                    <div className="w-20 p-1 text-right">DESCONTO</div>
                </div>

                {/* ITEMS */}
                <div className="text-[8px]">
                    {earnings.map((e: any, i: number) => (
                        <div key={`p-${i}`} className="flex border-b border-gray-200 last:border-0 border-dotted">
                            <div className="w-10 p-1 border-r border-black text-center font-mono text-gray-500">{e.code || '000'}</div>
                            <div className="flex-1 p-1 border-r border-black uppercase">{e.description}</div>
                            <div className="w-16 p-1 border-r border-black text-center">{e.reference || '-'}</div>
                            <div className="w-20 p-1 border-r border-black text-right font-mono">{money(e.value)}</div>
                            <div className="w-20 p-1 text-right font-mono text-gray-300">0,00</div>
                        </div>
                    ))}
                    {deductions.map((e: any, i: number) => (
                        <div key={`d-${i}`} className="flex border-b border-gray-200 last:border-0 border-dotted">
                            <div className="w-10 p-1 border-r border-black text-center font-mono text-gray-500">{e.code || '000'}</div>
                            <div className="flex-1 p-1 border-r border-black uppercase">{e.description}</div>
                            <div className="w-16 p-1 border-r border-black text-center">{e.reference || '-'}</div>
                            <div className="w-20 p-1 border-r border-black text-right font-mono text-gray-300">0,00</div>
                            <div className="w-20 p-1 text-right font-mono text-red-700">{money(e.value)}</div>
                        </div>
                    ))}
                </div>

                {/* TOTALS */}
                <div className="border-t border-black flex font-bold bg-gray-50">
                    <div className="col-span-3 flex-1 p-1 border-r border-black text-right pr-2">TOTAIS</div>
                    <div className="w-20 p-1 border-r border-black text-right">{money(data.totalProventos)}</div>
                    <div className="w-20 p-1 text-right text-red-700">{money(data.totalDescontos)}</div>
                </div>
            </div>

            {/* 5. LIQUIDO */}
            <div className="border border-black border-t-0 mb-4 p-2 bg-gray-100 flex justify-between items-center">
                <div className="font-bold text-[10px] uppercase">Total Líquido Rescisório</div>
                <div className="font-bold text-lg">{money(data.netSalary)}</div>
            </div>

            {/* SIGNATURES */}
            <div className="mt-8 grid grid-cols-2 gap-12 text-center text-[8px]">
                <div className="border-t border-black pt-2">
                    {company?.razaoSocial || 'EMPREGADOR'}
                    <div className="text-[7px] text-gray-500">ASSINATURA DO EMPREGADOR/PREPOSTO</div>
                </div>
                <div className="border-t border-black pt-2">
                    {data.person.name.toUpperCase()}
                    <div className="text-[7px] text-gray-500">ASSINATURA DO TRABALHADOR</div>
                </div>
            </div>

            <div className="mt-4 text-[7px] text-gray-400 text-center">
                A assistência à rescisão contratual é gratuita.
            </div>
        </div>
    );
};
