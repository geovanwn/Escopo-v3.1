import jsPDF from 'jspdf';

// ══════════════════════════════════════════════════════════════════════════════
// PAYSLIP PDF GENERATOR — 100% jsPDF nativo, sem html2canvas
// Geometria totalmente revisada para alinhamento milimétrico de colunas.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Utilities ──────────────────────────────────────────────────────────────
const money = (v?: number | null): string =>
    (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dateBR = (d?: string): string => {
    if (!d) return '–';
    try {
        const dateParts = d.split('-');
        if (dateParts.length === 3) {
            return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
        }
        return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch { return d; }
};

const clip = (s: string, max: number): string =>
    s && s.length > max ? s.substring(0, max - 1) + '…' : (s || '');

const faixaIRRF = (base: number, has: boolean): string => {
    if (!has || base <= 2259.20) return 'Isento';
    if (base <= 2826.65) return '7,5%';
    if (base <= 3751.05) return '15%';
    if (base <= 4664.68) return '22,5%';
    return '27,5%';
};

// ─── Colors ─────────────────────────────────────────────────────────────────
type C3 = [number, number, number];
const NAVY: C3 = [26, 50, 87];
const WHITE: C3 = [255, 255, 255];
const BLK: C3 = [30, 30, 30];
const GRY: C3 = [100, 100, 100];
const LGRY: C3 = [140, 140, 140];
const BGRY: C3 = [242, 244, 247];
const BORD: C3 = [80, 80, 80];
const GRN: C3 = [13, 110, 47];
const DGRN: C3 = [21, 128, 61];
const RED: C3 = [185, 49, 35];
const BLUE: C3 = [30, 110, 200];
const GBDG: C3 = [90, 105, 120];

// ─── Layout (mm) ────────────────────────────────────────────────────────────
const MG = 5;
const PW = 200;
const LX = MG;
const RX = MG + PW;

export const drawPayslipVia = (
    doc: jsPDF,
    data: any,
    company: any,
    competence: string,
    label: string,
    y0: number
): number => {
    const events: any[] = Array.isArray(data?.events) ? data.events : [];
    const nRows = Math.max(events.length, 5);

    // ── HELPER FUNCTIONS ────────────────────────────────────────
    const bg = (x: number, y: number, w: number, h: number, c: C3) => {
        doc.setFillColor(...c); doc.rect(x, y, w, h, 'F');
    };
    const box = (x: number, y: number, w: number, h: number, c: C3, lw = 0.3) => {
        doc.setDrawColor(...c); doc.setLineWidth(lw); doc.rect(x, y, w, h, 'S');
    };
    const hl = (y: number, c: C3 = BORD, lw = 0.25, x1 = LX, x2 = RX) => {
        doc.setDrawColor(...c); doc.setLineWidth(lw); doc.line(x1, y, x2, y);
    };
    const vl = (x: number, y1: number, y2: number, c: C3 = [200, 200, 200], lw = 0.2) => {
        doc.setDrawColor(...c); doc.setLineWidth(lw); doc.line(x, y1, x, y2);
    };
    const t = (
        s: string, x: number, y: number, sz: number, c: C3,
        b = false, a: 'left' | 'right' | 'center' = 'left'
    ) => {
        doc.setFontSize(sz); doc.setTextColor(...c);
        doc.setFont('helvetica', b ? 'bold' : 'normal');
        doc.text(String(s ?? ''), x, y, { align: a });
    };

    let y = y0;

    // ═══════════════════════════════════════════════════════════════
    // A) HEADER 
    // ═══════════════════════════════════════════════════════════════
    const H_HDR = 20;
    bg(LX, y, PW, H_HDR, WHITE);

    t(clip((company?.razaoSocial || 'EMPRESA').toUpperCase(), 42), LX + 2, y + 6.5, 10, BLK, true);
    const ad1 = clip([company?.address?.street, company?.address?.number, company?.address?.neighborhood].filter(Boolean).join(', '), 60);
    const ad2 = clip(`${company?.address?.city || ''} – ${company?.address?.state || 'UF'} | CNPJ: ${company?.cnpj || ''}`, 65);
    t(ad1, LX + 2, y + 11, 6.5, GRY);
    t(ad2, LX + 2, y + 15, 6.5, GRY);

    const TBW = 68;
    const TBX = LX + PW - TBW;
    bg(TBX, y, TBW, H_HDR, NAVY);
    t('RECIBO DE PAGAMENTO', TBX + TBW / 2, y + 5.5, 7, WHITE, true, 'center');
    t('DE SALÁRIO', TBX + TBW / 2, y + 9.5, 7, WHITE, true, 'center');

    const [mm, yyyy] = (competence || '01/2024').split('/');
    let mName = '';
    try { mName = new Date(parseInt(yyyy), parseInt(mm) - 1).toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' }).toUpperCase(); } catch { mName = mm; }
    t(`${mName}/${yyyy}`, TBX + TBW / 2, y + 14.5, 8, WHITE, true, 'center');

    const isV1 = label.includes('1');
    bg(TBX + 2, y + 16, TBW - 4, 3.5, isV1 ? BLUE : GBDG);
    t(label, TBX + TBW / 2, y + 18.5, 5.5, WHITE, true, 'center');

    y += H_HDR;
    hl(y, BORD, 0.4);

    // ═══════════════════════════════════════════════════════════════
    // B) EMPLOYEE ROW 
    // ═══════════════════════════════════════════════════════════════
    const H_EMP = 10;
    bg(LX, y, PW, H_EMP, BGRY);

    const eCols = [
        { l: 'CÓDIGO', v: clip(data?.person?.id || '', 7), w: 15 },
        { l: 'NOME DO FUNCIONÁRIO', v: clip((data?.person?.name || '').toUpperCase(), 30), w: 62 },
        { l: 'CBO', v: data?.person?.cbo || '–', w: 14 },
        { l: 'FUNÇÃO / CARGO', v: clip((data?.person?.role || '–').toUpperCase(), 16), w: 34 },
        { l: 'DATA ADMISSÃO', v: dateBR(data?.person?.admissionDate), w: 24 },
        { l: 'PIS / NIT', v: clip(data?.person?.pis || '–', 18), w: 51 },
    ];
    let ex = LX;
    eCols.forEach((c, i) => {
        t(c.l, ex + 1, y + 3.5, 4.5, LGRY, true);
        t(c.v, ex + 1, y + 8, 7, BLK, true);
        ex += c.w;
        if (i < eCols.length - 1) vl(ex, y, y + H_EMP);
    });

    y += H_EMP;
    hl(y, BORD, 0.35);

    // ═══════════════════════════════════════════════════════════════
    // C) TABLE HEADER 
    // ═══════════════════════════════════════════════════════════════
    const H_TH = 6;
    bg(LX, y, PW, H_TH, NAVY);

    const tC = [
        { l: 'CÓD.', w: 12, a: 'center' as const },
        { l: 'DESCRIÇÃO', w: 81, a: 'left' as const },
        { l: 'REFERÊNCIA', w: 25, a: 'center' as const },
        { l: 'VENCIMENTOS', w: 41, a: 'right' as const },
        { l: 'DESCONTOS', w: 41, a: 'right' as const },
    ];
    let hx = LX;
    tC.forEach((c, i) => {
        const ax = c.a === 'right' ? hx + c.w - 2 : c.a === 'center' ? hx + c.w / 2 : hx + 2;
        t(c.l, ax, y + H_TH - 1.5, 6, WHITE, true, c.a);
        hx += c.w;
        if (i < tC.length - 1) {
            doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.1);
            doc.line(hx, y + 1, hx, y + H_TH - 1);
        }
    });

    y += H_TH;
    hl(y, BORD, 0.3);

    // ═══════════════════════════════════════════════════════════════
    // D) EVENT ROWS 
    // ═══════════════════════════════════════════════════════════════
    const H_ROW = 6;
    for (let i = 0; i < nRows; i++) {
        const ev = events[i];
        if (i % 2 === 1) bg(LX, y, PW, H_ROW, [250, 250, 252]);

        if (ev) {
            let rx = LX;
            // Cod
            t(String(ev.code || (i + 1)).padStart(3, '0'), rx + tC[0].w / 2, y + H_ROW - 1.5, 7, GRY, false, 'center');
            rx += tC[0].w;
            // Desc
            t(clip((ev.description || '').toUpperCase(), 45), rx + 2, y + H_ROW - 1.5, 7, BLK);
            rx += tC[1].w;
            // Ref
            t(clip(ev.reference || '', 10), rx + tC[2].w / 2, y + H_ROW - 1.5, 7, GRY, false, 'center');
            rx += tC[2].w;
            // Venc
            if (ev.type === 'provento') t(money(ev.value), rx + tC[3].w - 2, y + H_ROW - 1.5, 7, DGRN, true, 'right');
            rx += tC[3].w;
            // Desc
            if (ev.type === 'desconto') t(money(ev.value), rx + tC[4].w - 2, y + H_ROW - 1.5, 7, RED, true, 'right');
        }

        // CORRECTED Column Separators: Start at LX and properly accumulate width
        let sx = LX;
        tC.slice(0, -1).forEach(c => {
            sx += c.w;
            vl(sx, y, y + H_ROW, [220, 220, 220], 0.15);
        });

        hl(y + H_ROW, [230, 230, 230], 0.1);
        y += H_ROW;
    }
    hl(y, BORD, 0.35);

    // ═══════════════════════════════════════════════════════════════
    // E) TOTALS
    // ═══════════════════════════════════════════════════════════════
    const H_TOT = 22;
    // PERFECT ALIGNMENT:
    // MENSAGEM width precisely matches (CÓD + DESC + REF) columns
    const MSG_W = tC[0].w + tC[1].w + tC[2].w; // 12 + 81 + 25 = 118
    // TOTALS width precisely matches (VENCIMENTOS + DESCONTOS) columns
    const TOT_W = tC[3].w + tC[4].w;           // 41 + 41 = 82
    const TOT_X = LX + MSG_W;
    const HALF = TOT_W / 2;                   // 41

    bg(LX, y, MSG_W, H_TOT, WHITE);
    t('MENSAGEM AO COLABORADOR', LX + 2, y + 4, 5, LGRY, true);

    vl(TOT_X, y, y + H_TOT, BORD, 0.35); // Main vertical divider

    // E1: labels
    bg(TOT_X, y, TOT_W, 6, WHITE);
    vl(TOT_X + HALF, y, y + 6, [200, 200, 200], 0.3); // Internal divider between VENC/DESC
    t('TOTAL VENCIMENTOS', TOT_X + HALF / 2, y + 4, 5, LGRY, true, 'center');
    t('TOTAL DESCONTOS', TOT_X + HALF + HALF / 2, y + 4, 5, LGRY, true, 'center');

    hl(y + 6, [200, 200, 200], 0.15, TOT_X, RX);

    // E2: values
    bg(TOT_X, y + 6, TOT_W, 8, WHITE);
    vl(TOT_X + HALF, y + 6, y + 14, [200, 200, 200], 0.3);
    t(money(data?.totalProventos), TOT_X + HALF / 2, y + 11.5, 9, DGRN, true, 'center');
    t(money(data?.totalDescontos), TOT_X + HALF + HALF / 2, y + 11.5, 9, RED, true, 'center');

    hl(y + 14, BORD, 0.3, TOT_X, RX);

    // E3: green band
    bg(TOT_X, y + 14, TOT_W, 8, GRN);
    // Removed '%º' or '>>' completely, looks cleaner and avoids font encoding issues.
    t('VALOR LÍQUIDO', TOT_X + 4, y + 19.5, 8, WHITE, true);
    t(money(data?.netSalary), RX - 3, y + 19.5, 11, WHITE, true, 'right');

    y += H_TOT;
    hl(y, BORD, 0.4);

    // ═══════════════════════════════════════════════════════════════
    // F) BASE VALUES
    // ═══════════════════════════════════════════════════════════════
    const H_BASE = 10;
    bg(LX, y, PW, H_BASE, BGRY);

    const bSal = data?.baseSalary
        || events.find((e: any) => (e.description || '').match(/sal[aá]rio|pro.labore/i))?.value
        || 0;
    const hasIR = events.some((e: any) => (e.description || '').includes('IRRF'));

    const bC = [
        { l: 'SAL. BASE', v: money(bSal), w: 34 },
        { l: 'SAL. CONTR. INSS', v: money(data?.baseINSS), w: 33 },
        { l: 'BASE FGTS', v: money(data?.baseFGTS), w: 33 },
        { l: 'FGTS MÊS', v: money(data?.fgtsValue), w: 33 },
        { l: 'BASE IRRF', v: money(data?.baseIRRF), w: 33 },
        { l: 'FAIXA IRRF', v: faixaIRRF(data?.baseIRRF || 0, hasIR), w: 34 },
    ];
    let bx = LX;
    bC.forEach((c, i) => {
        t(c.l, bx + 1.5, y + 3.5, 5, LGRY, true);
        t(c.v, bx + 1.5, y + 8, 7, BLK, true);
        bx += c.w;
        if (i < bC.length - 1) vl(bx, y, y + H_BASE);
    });

    y += H_BASE;
    hl(y, BORD, 0.35);

    // ═══════════════════════════════════════════════════════════════
    // G) SIGNATURE 
    // ═══════════════════════════════════════════════════════════════
    const H_SIG = 14;
    bg(LX, y, PW, H_SIG, WHITE);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...GRY);
    doc.text('Declaro ter recebido a importância líquida discriminada neste recibo.', LX + 2, y + 4.5);

    const sigs = [
        { l: 'DATA', x: LX + 2, w: 28 },
        { l: 'ASSINATURA DO FUNCIONÁRIO', x: LX + 36, w: 78 },
        { l: 'RESPONSÁVEL / RH', x: LX + 120, w: 78 },
    ];
    sigs.forEach(s => {
        hl(y + H_SIG - 4, BORD, 0.3, s.x, s.x + s.w);
        t(s.l, s.x + s.w / 2, y + H_SIG - 1.5, 5, LGRY, false, 'center');
    });

    y += H_SIG;

    // ═══════════════════════════════════════════════════════════════
    // OUTER BORDER
    // ═══════════════════════════════════════════════════════════════
    box(LX, y0, PW, y - y0, BORD, 0.5);

    // Legal footer
    t(
        `Documento emitido conforme Art. 464 da CLT. Autenticidade verificável nos registros da empresa. | Emissão: ${new Date().toLocaleDateString('pt-BR')}`,
        LX + PW / 2, y + 2.5, 5, [180, 180, 180], false, 'center'
    );

    return y + 4;
};

export const generatePayslipPDF = (
    data: any,
    company: any,
    competence: string
): jsPDF => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pH = doc.internal.pageSize.getHeight();

    const end1 = drawPayslipVia(doc, data, company, competence, '1ª VIA - EMPREGADOR', 5);

    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.25);
    (doc as any).setLineDashPattern([2, 2], 0);
    doc.line(LX, end1, RX, end1);
    (doc as any).setLineDashPattern([], 0);

    const start2 = end1 + 3;
    if (start2 + 135 <= pH) {
        drawPayslipVia(doc, data, company, competence, '2ª VIA - COLABORADOR', start2);
    } else {
        doc.addPage();
        drawPayslipVia(doc, data, company, competence, '2ª VIA - COLABORADOR', 5);
    }

    return doc;
};
