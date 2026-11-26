import jsPDF from 'jspdf';
import { CompanyEntity, Invoice } from '../types';
import { formatDateBR } from './formatters';

export const generateInvoicePDF = (invoice: Invoice, company: CompanyEntity | null) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // --- Header ---
    doc.setFillColor(31, 41, 55); // Slate 800
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.type === 'exit' ? 'FATURA / RECIBO' : 'DOCUMENTO DE ENTRADA', margin, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nº ${invoice.number}`, margin, 30);
    doc.text(`EMISSÃO: ${formatDateBR(invoice.date)}`, pageWidth - margin, 20, { align: 'right' });

    if (invoice.status === 'paga') {
        doc.setTextColor(34, 197, 94); // Green
        doc.setFont('helvetica', 'bold');
        doc.text('PAGO', pageWidth - margin, 30, { align: 'right' });
    } else {
        doc.setTextColor(249, 115, 22); // Orange
        doc.setFont('helvetica', 'bold');
        doc.text('PENDENTE', pageWidth - margin, 30, { align: 'right' });
    }

    // --- Provider / Client Box ---
    let y = 50;

    // Prestador (Company)
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('PRESTADOR DE SERVIÇOS / EMITENTE', margin, y);
    y += 5;

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFont('helvetica', 'bold');
    doc.text(company?.razaoSocial || (invoice.type === 'entry' ? invoice.entityName : 'Sua Empresa'), margin, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (company?.cnpj) {
        doc.text(`CNPJ: ${company.cnpj}`, margin, y);
        y += 4;
    }
    if (company?.address) {
        doc.text(`${company.address.street}, ${company.address.number || 'S/N'} - ${company.address.city}/${company.address.uf}`, margin, y);
    }

    // Tomador (Client)
    y += 15;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('TOMADOR / DESTINATÁRIO', margin, y);
    y += 5;

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.entityName || 'Cliente Não Identificado', margin, y);

    // --- Descriptions ---
    y += 20;
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('DESCRIÇÃO DOS SERVIÇOS / PRODUTOS', margin, y);
    y += 7;

    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85); // Slate 700
    const splittedDesc = doc.splitTextToSize(invoice.details || 'Serviços Prestados', pageWidth - (margin * 2));
    doc.text(splittedDesc, margin, y);

    y += (splittedDesc.length * 5) + 20;

    // --- Values ---
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 30, 2, 2, 'F');

    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('VALOR TOTAL', margin + 10, y);

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    const valueStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.value);
    doc.text(valueStr, pageWidth - margin - 10, y, { align: 'right' });

    // --- Footer ---
    const footerY = 280;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Este documento não substitui a Nota Fiscal Eletrônica (NF-e) oficial para fins fiscais, sendo apenas um recibo financeiro.', pageWidth / 2, footerY, { align: 'center' });

    doc.save(`Fatura_${invoice.number}.pdf`);
};
