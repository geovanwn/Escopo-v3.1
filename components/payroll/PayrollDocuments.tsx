import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { FileText, Printer, FileSignature, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import jsPDF from 'jspdf';

// Tipos de documentos
type DocType = 'presenca' | 'contrato' | 'advertencia' | 'suspensao' | 'aviso_ferias' | 'aviso_rescisao';

const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } else {
                reject(new Error('Canvas context is null'));
            }
        };
        img.onerror = error => reject(error);
    });
};

interface PayrollDocumentsProps {
    initialEmployeeId?: string;
}

export const PayrollDocuments: React.FC<PayrollDocumentsProps> = ({ initialEmployeeId }) => {
    const { employees, partners, selectedCompany } = useData();
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployeeId || '');
    const [docType, setDocType] = useState<DocType>('presenca');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [month, setMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [notes, setNotes] = useState('');
    const [suspensionDays, setSuspensionDays] = useState<number>(1);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

    const people = [...employees, ...partners];
    const selectedEmployee = people.find(p => p.id === selectedEmployeeId) as any;

    const generatePDF = async (preview: boolean = false) => {
        if (!selectedCompany || (!selectedEmployee && docType !== 'presenca')) {
            alert("Selecione uma empresa e um funcionário.");
            return;
        }

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        // --- Colors ---
        const colorPrimary: [number, number, number] = [37, 99, 235]; // Blue 600
        const colorText: [number, number, number] = [30, 41, 59]; // Slate 800
        const colorSubtext: [number, number, number] = [100, 116, 139]; // Slate 500
        const colorBorder: [number, number, number] = [226, 232, 240]; // Slate 200

        // --- Header Section ---
        const margin = 20;

        // Logo
        if (selectedCompany.logo) {
            try {
                const logoData = await getBase64ImageFromURL(selectedCompany.logo);
                doc.addImage(logoData, 'PNG', margin, 15, 12, 12);
            } catch (e) {
                console.error('Error loading logo:', e);
                doc.setFillColor(239, 246, 255);
                doc.roundedRect(margin, 15, 12, 12, 2, 2, 'F');
                doc.setTextColor(37, 99, 235);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(selectedCompany.razaoSocial.substring(0, 1) || 'E', margin + 3.5, 22.5);
            }
        } else {
            doc.setFillColor(239, 246, 255);
            doc.roundedRect(margin, 15, 12, 12, 2, 2, 'F');
            doc.setTextColor(37, 99, 235);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(selectedCompany.razaoSocial.substring(0, 1) || 'E', margin + 3.5, 22.5);
        }

        // Company Info
        doc.setTextColor(colorText[0], colorText[1], colorText[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedCompany.nomeFantasia || selectedCompany.razaoSocial || 'Empresa Não Identificada', margin + 16, 18);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(selectedCompany.razaoSocial || '', margin + 16, 22);

        doc.setFontSize(7);
        doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
        const cnpjText = selectedCompany.cnpj ? `CNPJ: ${selectedCompany.cnpj}` : '';
        doc.text(cnpjText, margin + 16, 26);

        if (selectedCompany.address) {
            const { street, number, neighborhood, city, uf } = selectedCompany.address;
            const addrParts = [street, number ? `Nº ${number}` : '', neighborhood, city, uf].filter(Boolean).join(', ');
            doc.text(addrParts, margin + 16, 30);
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
        doc.text('DOCUMENTO RH'.toUpperCase(), pageWidth - margin, 19, { align: 'right' });

        const topStripY = 35;
        doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
        (doc as any).setLineDash([1, 1], 0);
        doc.line(margin, topStripY, pageWidth - margin, topStripY);
        (doc as any).setLineDash([], 0);

        let yPos = 45;

        // Helper functions
        const centerText = (text: string, y: number, size = 12, isBold = false) => {
            doc.setFontSize(size);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.setTextColor(colorText[0], colorText[1], colorText[2]);
            doc.text(text, pageWidth / 2, y, { align: 'center' });
        };

        const justifyText = (text: string, initY: number, maxWidth = 170) => {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(colorText[0], colorText[1], colorText[2]);

            const paragraphs = text.split('\n');
            let currentY = initY;
            const lineHeight = 5;

            for (let p = 0; p < paragraphs.length; p++) {
                const para = paragraphs[p];
                if (para.trim() === '') {
                    currentY += lineHeight;
                    continue;
                }

                const lines = doc.splitTextToSize(para, maxWidth);

                for (let i = 0; i < lines.length; i++) {
                    if (currentY > 275) {
                        doc.addPage();
                        currentY = 20;

                        // Redraw Top Header
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
                        doc.text('DOCUMENTO RH'.toUpperCase(), pageWidth - margin, 19, { align: 'right' });

                        doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
                        (doc as any).setLineDash([1, 1], 0);
                        doc.line(margin, 35, pageWidth - margin, 35);
                        (doc as any).setLineDash([], 0);
                        currentY = 45;

                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(colorText[0], colorText[1], colorText[2]);
                    }
                    if (i === lines.length - 1) {
                        doc.text(lines[i], margin, currentY);
                    } else {
                        doc.text(lines[i], margin, currentY, { align: 'justify', maxWidth: maxWidth });
                    }
                    currentY += lineHeight;
                }
            }
            return currentY - initY; // Return height used
        };

        const getEmpData = () => {
            if (!selectedEmployee) return '';
            const admissao = selectedEmployee.admissionDate ? new Date(selectedEmployee.admissionDate).toLocaleDateString('pt-BR') : '_____/_____/_____';
            const baseValue = selectedEmployee.salary || selectedEmployee.baseSalary || selectedEmployee.proLaboreValue;
            const salario = baseValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(baseValue) : 'N/A';
            const role = selectedEmployee.role || 'Sócio';
            const matricula = selectedEmployee.registration || '0000';
            const cbo = selectedEmployee.cbo || 'N/A';

            return `\nDados Contratuais: Matrícula: ${matricula} | CBO: ${cbo}\nAdmissão: ${admissao} | Salário Base: ${salario}`;
        };

        if (docType === 'presenca') {
            centerText('FOLHA DE PRESENÇA', yPos, 14, true);
            yPos += 10;
            centerText(`Mês de Referência: ${month}`, yPos, 10);
            yPos += 15;

            if (selectedEmployee) {
                const admission = selectedEmployee.admissionDate ? new Date(selectedEmployee.admissionDate).toLocaleDateString('pt-BR') : '___/___/___';
                const registration = selectedEmployee.registration || '_________________';
                const role = selectedEmployee.role || '__________________________________';
                const weeklyHours = selectedEmployee.weeklyHours || '_________________';
                const cbo = selectedEmployee.cbo || '_____________';

                const textHeight = justifyText(`Nome Completo: ${selectedEmployee.name}\nMatrícula do Cadastro: ${registration}  Cargo: ${role}\nJornada de Trabalho: ${weeklyHours}  CBO: ${cbo}  Data de Admissão: ${admission}`, yPos);
                yPos += textHeight + 6; // Usar a altura real e adicionar margem
            } else {
                const textHeight = justifyText(`Nome Completo: _________________________________________________________________\nMatrícula do Cadastro: _________________  Cargo: __________________________________\nJornada de Trabalho: _________________  CBO: _____________  Data de Admissão: ___/___/___`, yPos);
                yPos += textHeight + 6;
            }

            // Tabela Folha de Presenca
            doc.setDrawColor(0);
            doc.setFillColor(230, 230, 230);
            doc.rect(margin, yPos, 170, 5, 'FD'); // Fill and border

            doc.setFontSize(7);
            doc.setTextColor(colorText[0], colorText[1], colorText[2]);
            doc.setFont('helvetica', 'bold');
            doc.text("DIA", margin + 7.5, yPos + 3.5, { align: 'center' });
            doc.text("ENTRADA", margin + 30, yPos + 3.5, { align: 'center' });
            doc.text("SAIDA", margin + 60, yPos + 3.5, { align: 'center' });
            doc.text("ENTRADA", margin + 90, yPos + 3.5, { align: 'center' });
            doc.text("SAIDA", margin + 120, yPos + 3.5, { align: 'center' });
            doc.text("ASSINATURA", margin + 138, yPos + 3.5);

            yPos += 5;
            doc.setFont('helvetica', 'normal');

            const yearStr = parseInt(month.split('-')[0]);
            const monthStr = parseInt(month.split('-')[1]);
            const daysInMonth = new Date(yearStr, monthStr, 0).getDate();

            for (let i = 1; i <= daysInMonth; i++) {
                if (yPos > 275) {
                    doc.addPage();
                    yPos = 20;

                    doc.setFillColor(230, 230, 230);
                    doc.rect(margin, yPos, 170, 5, 'FD');
                    doc.setFont('helvetica', 'bold');
                    doc.text("DIA", margin + 7.5, yPos + 3.5, { align: 'center' });
                    doc.text("ENTRADA", margin + 30, yPos + 3.5, { align: 'center' });
                    doc.text("SAIDA", margin + 60, yPos + 3.5, { align: 'center' });
                    doc.text("ENTRADA", margin + 90, yPos + 3.5, { align: 'center' });
                    doc.text("SAIDA", margin + 120, yPos + 3.5, { align: 'center' });
                    doc.text("ASSINATURA", margin + 138, yPos + 3.5);
                    yPos += 5;
                    doc.setFont('helvetica', 'normal');
                }

                doc.rect(margin, yPos, 170, 4.8);
                doc.line(margin + 15, yPos, margin + 15, yPos + 4.8);
                doc.line(margin + 45, yPos, margin + 45, yPos + 4.8);
                doc.line(margin + 75, yPos, margin + 75, yPos + 4.8);
                doc.line(margin + 105, yPos, margin + 105, yPos + 4.8);
                doc.line(margin + 135, yPos, margin + 135, yPos + 4.8);

                doc.text(i.toString().padStart(2, '0'), margin + 7.5, yPos + 3.5, { align: 'center' });
                // Dados em branco conforme solicitação

                yPos += 4.8;
            }

        } else if (docType === 'contrato') {
            centerText('CONTRATO INDIVIDUAL DE TRABALHO', yPos, 14, true);
            yPos += 15;

            const cpf = selectedEmployee!.cpf || '_________________';
            const rg = selectedEmployee!.rg || '_________________';
            const nac = selectedEmployee!.nationality || '_________________';
            const estCiv = selectedEmployee!.maritalStatus || '_________________';
            const prof = selectedEmployee!.role || selectedEmployee!.cbo || '_________________';
            const endEmp = selectedEmployee!.address ? `${selectedEmployee!.address}, ${selectedEmployee!.addressNumber || 'S/N'}` : '________________________________________________________';
            const cidEmp = selectedEmployee!.city ? `${selectedEmployee!.city}/${selectedEmployee!.uf}` : '_________________ / ______';
            const weeklyHours = selectedEmployee!.weeklyHours || '______';
            const registration = selectedEmployee!.registration || '_________________';
            const cbo = selectedEmployee!.cbo || '_____________';
            const durationLiteral = selectedEmployee!.contractDurationType === 'determinado' ? 'determinado' : 'indeterminado';
            const admissionStr = selectedEmployee!.admissionDate ? new Date(selectedEmployee!.admissionDate).toLocaleDateString('pt-BR') : '_____/_____/_____';

            const cidEmpregador = selectedCompany.address?.city ? `${selectedCompany.address?.city}/${selectedCompany.address?.uf}` : '______________________________';
            const endEmpregador = selectedCompany.address?.street ? `${selectedCompany.address.street}, ${selectedCompany.address.number}` : '______________________________';

            const salBaseStr = selectedEmployee.baseSalary ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedEmployee.baseSalary) : 'R$ _________________';

            const contratoTxt = `Pelo presente instrumento particular, de um lado o EMPREGADOR, identificado da seguinte forma:

EMPREGADOR: ${selectedCompany.razaoSocial}
CNPJ: ${selectedCompany.cnpj}
Endereço: ${endEmpregador}
Cidade/Estado: ${cidEmpregador}

E, de outro lado, o EMPREGADO:

EMPREGADO: ${selectedEmployee!.name}
Nacionalidade: ${nac}
Estado Civil: ${estCiv}
Função/Profissão: ${prof}
Matrícula: ${registration}    CBO: ${cbo}
RG: ${rg}   CPF: ${cpf}
Endereço: ${endEmp}
Cidade/Estado: ${cidEmp}

As partes acima identificadas têm entre si justo e contratado o presente Contrato Individual de Trabalho, que será regido pelas disposições da Consolidação das Leis do Trabalho (CLT) e demais normas aplicáveis, mediante as cláusulas abaixo descritas.

CLÁUSULA 1 – FUNÇÃO
O EMPREGADO exercerá a função de ${selectedEmployee!.role || '_________________________________'}, desempenhando as atividades inerentes ao cargo e outras compatíveis com sua condição pessoal e profissional.

CLÁUSULA 2 – LOCAL DE TRABALHO
O local de trabalho será em ${selectedCompany.razaoSocial}. O EMPREGADO poderá ser transferido nos casos permitidos pela legislação.

CLÁUSULA 3 – JORNADA DE TRABALHO
A jornada semanal será de ${weeklyHours} horas, distribuídas de ____________________________. Intervalos para repouso e alimentação serão concedidos conforme a legislação.

CLÁUSULA 4 – REMUNERAÇÃO
O EMPREGADO receberá salário mensal de ${salBaseStr} (__________________________________). O pagamento será efetuado até o quinto dia útil do mês subsequente.

CLÁUSULA 5 – INÍCIO DA VIGÊNCIA
O presente contrato tem início em ${admissionStr}, sendo por prazo ${durationLiteral}. Caso seja por prazo determinado, o termo final será em _____/_____/_____.

CLÁUSULA 6 – FÉRIAS E 13º SALÁRIO
O EMPREGADO terá direito a férias anuais remuneradas e ao décimo terceiro salário, conforme a CLT.

CLÁUSULA 7 – FGTS
O EMPREGADOR efetuará depósitos mensais correspondentes ao FGTS, na forma da lei.

CLÁUSULA 8 – DESCONTOS
Poderão ser efetuados descontos legais e autorizados pelo EMPREGADO, tais como INSS, vale-transporte, faltas e danos causados por dolo.

CLÁUSULA 9 – OBRIGAÇÕES DO EMPREGADO
O EMPREGADO se compromete a:
- Cumprir suas funções com zelo e eficiência;
- Respeitar normas internas e superiores hierárquicos;
- Zelar pelos bens e instalações do EMPREGADOR.

CLÁUSULA 10 – RESCISÃO CONTRATUAL
A rescisão seguirá o previsto na CLT, podendo ocorrer por iniciativa de qualquer das partes, por justa causa ou demais hipóteses legais.

CLÁUSULA 11 – CONFIDENCIALIDADE
O EMPREGADO compromete-se a manter sigilo sobre informações internas, mesmo após o encerramento do contrato.

CLÁUSULA 12 – FUNDAMENTAÇÃO LEGAL
O presente contrato fundamenta-se, especialmente, nos seguintes dispositivos legais da legislação brasileira vigente:
- Consolidação das Leis do Trabalho (CLT), arts. 2º e 3º;
- CLT, arts. 58 a 75 (jornada de trabalho, horas extras e intervalos);
- CLT, arts. 129 a 153 (férias e adicional de 1/3 constitucional);
- CLT, arts. 457 a 467 (salário, adicionais e composição da remuneração);
- Lei nº 8.036/1990 e Decreto nº 99.684/1990 (FGTS);
- Lei nº 4.090/1962 e Lei nº 4.749/1965 (13º salário);
- CLT, arts. 442 a 451 (tipos de contrato e rescisão);
- CLT, art. 482 (hipóteses de justa causa);
- CLT, art. 483 (rescisão indireta);
- Constituição Federal, art. 7º (direitos fundamentais dos trabalhadores).

Por estarem de pleno acordo, as partes assinam o presente contrato, em duas vias de igual teor.`;

            yPos += justifyText(contratoTxt, yPos);

        } else if (docType === 'advertencia') {
            centerText('CARTA DE ADVERTÊNCIA DISCIPLINAR', yPos, 14, true);
            yPos += 15;

            let dataInfracao = '_____/_____/_____';
            if (startDate) {
                const [y, m, d] = startDate.split('-').map(Number);
                dataInfracao = new Date(y, m - 1, d).toLocaleDateString('pt-BR');
            }

            const text = `À(o) Sr(a). ${selectedEmployee!.name}\nCPF: ${selectedEmployee!.cpf}\nFunção: ${selectedEmployee!.role || 'Não informada'}\n\nVimos por meio desta, no uso do nosso poder diretivo, aplicar-lhe ADVERTÊNCIA DISCIPLINAR em razão de atitude cometida no dia ${dataInfracao}.\n\nEsta medida decorre do seguinte fato: ${notes || '[Descrição detalhada do motivo]'}.\n\nEsclarecemos que tal conduta configura violação dos deveres inerentes ao contrato de trabalho e ao regulamento interno da empresa. Esta penalidade possui caráter estritamente educativo e preventivo.\n\nContamos com a sua colaboração para que faltas desta natureza não voltem a ocorrer, sendo resguardado no artigo 482 da Consolidação das Leis do Trabalho (CLT) a possiblidade de medidas mais rigorosas se a postura persistir.\n\nAdvertimos formalmente que a reincidência neste ou em outros atos de indisciplina poderá acarretar suspensão ou até a rescisão do contrato de trabalho por justa causa.`;
            yPos += justifyText(text, yPos);

        } else if (docType === 'suspensao') {
            centerText('CARTA DE SUSPENSÃO DISCIPLINAR', yPos, 14, true);
            yPos += 15;

            const formatLocal = (isoDate: string, addDaysCount = 0) => {
                if (!isoDate) return '_____/_____/_____';
                const [y, m, d] = isoDate.split('-').map(Number);
                const dt = new Date(y, m - 1, d);
                dt.setDate(dt.getDate() + addDaysCount);
                return dt.toLocaleDateString('pt-BR');
            };

            const startStr = formatLocal(startDate, 0);
            const endStr = formatLocal(startDate, suspensionDays - 1);
            const returnStr = formatLocal(startDate, suspensionDays);

            const text = `À(o) Sr(a). ${selectedEmployee!.name}\nCPF: ${selectedEmployee!.cpf}\nFunção: ${selectedEmployee!.role || 'Não informada'}\n\nVimos por meio desta, no uso do poder diretivo e disciplinar conferido ao empregador, aplicar-lhe SUSPENSÃO DISCIPLINAR de ${suspensionDays} dia(s), compreendendo o período de ${startStr} a ${endStr}.\n\nA presente medida disciplinar decorre da seguinte infração: ${notes || '[Descrição detalhada do motivo]'}.\n\nEsclarecemos que tal conduta configura violação dos deveres inerentes ao contrato de trabalho e ao regulamento interno da empresa. Esta penalidade possui caráter educativo e corretivo, visando manter a disciplina e o bom andamento das atividades, encontrando amparo legal no artigo 482 e seguintes da Consolidação das Leis do Trabalho (CLT).\n\nO retorno às atividades normais e regulares deverá ocorrer obrigatoriamente no dia ${returnStr}, no seu horário habitual de trabalho. Durante o período de suspensão, haverá a respectiva perda da remuneração e do descanso semanal remunerado (DSR), conforme a legislação vigente (Art. 473 CLT / Lei nº 605/49).\n\nAdvertimos formalmente que a reincidência em faltas ou infrações desta natureza poderá caracterizar insubordinação ou indisciplina, resultando em medidas mais severas, incluindo a rescisão do contrato de trabalho por justa causa.`;
            yPos += justifyText(text, yPos);

        } else if (docType === 'aviso_ferias') {
            centerText('AVISO PRÉVIO DE FÉRIAS', yPos, 14, true);
            yPos += 15;

            let diasFerias = '____';
            let formatLocal = (iso: string) => iso ? iso.split('-').reverse().join('/') : '_____/_____/_____';
            let gozoStartStr = formatLocal(startDate);
            let gozoEndStr = formatLocal(endDate);

            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                diasFerias = diffDays.toString();
            }

            let aquisitivoStartStr = '_____/_____/_____';
            let aquisitivoEndStr = '_____/_____/_____';

            if (selectedEmployee?.admissionDate) {
                const [y, m, d] = selectedEmployee.admissionDate.split('-').map(Number);
                const adm = new Date(y, m - 1, d);

                let referenceDate = new Date();
                if (startDate) {
                    const [sy, sm, sd] = startDate.split('-').map(Number);
                    referenceDate = new Date(sy, sm - 1, sd);
                }

                let diffYears = referenceDate.getFullYear() - adm.getFullYear();
                if (referenceDate.getMonth() < adm.getMonth() || (referenceDate.getMonth() === adm.getMonth() && referenceDate.getDate() < adm.getDate())) {
                    diffYears--;
                }

                const pStart = new Date(adm);
                if (diffYears >= 1) {
                    pStart.setFullYear(pStart.getFullYear() + diffYears - 1);
                }

                const pEnd = new Date(pStart);
                pEnd.setFullYear(pEnd.getFullYear() + 1);
                pEnd.setDate(pEnd.getDate() - 1);

                aquisitivoStartStr = pStart.toLocaleDateString('pt-BR');
                aquisitivoEndStr = pEnd.toLocaleDateString('pt-BR');
            }

            const text = `À(o) Sr(a). ${selectedEmployee!.name}\nCPF: ${selectedEmployee!.cpf}\n${getEmpData()}\n\nEm estrito cumprimento ao disposto nos artigos 134 e 135 da Consolidação das Leis do Trabalho (CLT), vimos por meio desta comunicar formalmente que lhe serão concedidas as férias regulamentares de ${diasFerias} dias, relativas ao seu período aquisitivo de ${aquisitivoStartStr} a ${aquisitivoEndStr}.\n\nO respectivo Período de Gozo ocorrerá entre as datas de ${gozoStartStr} a ${gozoEndStr}.\n\nPara tal, solicitamos sua ciência no respectivo recibo. A remuneração correspondente às férias, acrescida do terço constitucional (Art. 7º, XVII, da CF/88), será efetuada até 2 (dois) dias antes do início do respectivo período, conforme prevê o Art. 145 da CLT. Devendo V. Sª. apresentar, no prazo oportuno, a sua Carteira de Trabalho e Previdência Social (CTPS) para as devidas anotações.`;
            yPos += justifyText(text, yPos);

        } else if (docType === 'aviso_rescisao') {
            centerText('AVISO PRÉVIO DE RESCISÃO DE CONTRATO', yPos, 14, true);
            yPos += 15;
            const text = `À(o) Sr(a). ${selectedEmployee!.name}\nCPF: ${selectedEmployee!.cpf}\nCTPS: ${selectedEmployee!.ctpsNum || '_________________'}\n\nComunicamos formalmente que não mais utilizaremos seus serviços, motivo pelo qual vimos notificá-lo(a) da rescisão do seu Contrato de Trabalho, sem justa causa, nos termos do Art. 487 da Consolidação das Leis do Trabalho (CLT).\n\n(  ) Aviso Prévio Trabalhado: Cumprirá aviso prévio pelo prazo estabelecido em lei (Art. 487, II, CLT e Lei nº 12.506/2011). Durante o prazo do aviso, em estrita observância ao Art. 488 da CLT, sua jornada normal de trabalho será reduzida em 2 (duas) horas diárias, sem prejuízo do salário integral, ou, alternativamente, poderá optar pela ausência no trabalho por 7 (sete) dias corridos.\n\n(  ) Aviso Prévio Indenizado: Pela conveniência da empresa, o sr(a) fica dispensado(a) do cumprimento do aviso prévio no local de trabalho. O valor correspondente ao período do aviso prévio será devidamente indenizado no ato do pagamento e quitação das verbas rescisórias aplicáveis.\n\nFavor comparecer ao respectivo departamento pessoal, em data a ser comunicada (dentro do prazo legal e estabelecido no Art. 477 da CLT), munido(a) de sua Carteira de Trabalho e Previdência Social (CTPS) para efetuar as devidas atualizações e encaminhamento para a realização imperativa do exame médico demissional (Art. 168 da CLT).`;
            yPos += justifyText(text, yPos);
        }

        // ASSINATURAS E RODAPÉ
        if (yPos + 40 > 285) {
            doc.addPage();
            yPos = 30;
        } else {
            yPos += 20;
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colorText[0], colorText[1], colorText[2]);

        // Local e Data (atende ao pedido do formato _____/_____/_____ com cidade/UF)
        const cityInfo = selectedCompany.address?.city
            ? `${selectedCompany.address.city} - ${selectedCompany.address.uf || 'GO'}`
            : '__________________________ - ____';
        centerText(`Local e Data: ${cityInfo}, _____/_____/_____`, yPos, 8);

        yPos += 18;

        doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
        doc.line(30, yPos, 80, yPos);
        doc.line(130, yPos, 180, yPos);

        // Assinatura Empregador
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedCompany.razaoSocial, 55, yPos + 6, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('CNPJ: ' + selectedCompany.cnpj, 55, yPos + 10, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text('EMPREGADOR', 55, yPos + 14, { align: 'center' });

        // Assinatura Empregado
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedEmployee ? selectedEmployee.name : 'EMPREGADO', 155, yPos + 6, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(selectedEmployee ? `CPF: ${selectedEmployee.cpf}` : '', 155, yPos + 10, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text('EMPREGADO / COLABORADOR', 155, yPos + 14, { align: 'center' });

        if (docType === 'contrato') {
            yPos += 30;
            if (yPos > 260) {
                doc.addPage();
                yPos = 30;
            }
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(colorText[0], colorText[1], colorText[2]);
            doc.text('TESTEMUNHAS:', margin, yPos);
            yPos += 20;

            doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
            doc.line(30, yPos, 80, yPos);
            doc.line(130, yPos, 180, yPos);

            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(`Nome: ________________________________ CPF: ________________________`, 55, yPos + 6, { align: 'center' });
            doc.text(`Nome: ________________________________ CPF: ________________________`, 155, yPos + 6, { align: 'center' });
            yPos += 20;
        } else {
            yPos += 22;
        }

        doc.setFontSize(6);
        doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
        doc.setFont('helvetica', 'italic');
        centerText('Este relatório foi gerado automaticamente pelo sistema.', 285, 6);

        if (preview) {
            setPdfPreviewUrl(doc.output('bloburl').toString());
        } else {
            doc.save(`documento_${docType}_${selectedEmployee?.name || 'geral'}.pdf`);
        }
    };

    return (
        <div className="flex w-full gap-6 animate-in fade-in zoom-in-95 duration-300 h-full">
            <div className="w-[280px] flex flex-col gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm shrink-0">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                    <FileText className="text-orange-500" size={18} />
                    Documentos Pessoais
                </h3>

                <div className="flex flex-col gap-1">
                    {[
                        { id: 'advertencia', label: 'Advertência Disciplinar' },
                        { id: 'aviso_ferias', label: 'Aviso de Férias' },
                        { id: 'aviso_rescisao', label: 'Aviso de Rescisão' },
                        { id: 'contrato', label: 'Contrato de Trabalho' },
                        { id: 'presenca', label: 'Folha de Presença' },
                        { id: 'suspensao', label: 'Folha de Suspensão' }
                    ].map(type => (
                        <button
                            key={type.id}
                            onClick={() => {
                                setDocType(type.id as DocType);
                                setPdfPreviewUrl(null);
                            }}
                            className={`text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${docType === type.id ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-[420px] bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm shrink-0 overflow-y-auto">
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold mb-4 uppercase text-gray-800 border-b pb-2">Configurar Documento</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Funcionário</label>
                                <select
                                    className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-orange-500 focus:border-orange-500"
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                >
                                    <option value="">Selecione um funcionário ou sócio...</option>
                                    <optgroup label="Funcionários (CLT)">
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </optgroup>
                                    <optgroup label="Sócios">
                                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </optgroup>
                                </select>
                            </div>

                            {docType === 'presenca' && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mês de Referência</label>
                                    <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full border rounded-lg p-2 bg-gray-50" />
                                </div>
                            )}

                            {docType === 'aviso_ferias' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data Inicial</label>
                                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-orange-500 focus:border-orange-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data Final</label>
                                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-orange-500 focus:border-orange-500" />
                                        </div>
                                    </div>
                                    {startDate && endDate && (
                                        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex items-center justify-between">
                                            <span className="text-xs font-medium text-orange-800 uppercase">Total de Dias</span>
                                            <span className="font-bold text-orange-700 text-sm">
                                                {(() => {
                                                    const start = new Date(startDate);
                                                    const end = new Date(endDate);
                                                    const diffTime = end.getTime() - start.getTime();
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                                    return diffDays > 0 ? `${diffDays} dia(s)` : 'Inválido';
                                                })()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {docType === 'advertencia' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data da Infração / Ocorrência</label>
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-orange-500 focus:border-orange-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Motivo / Observações Detalhadas</label>
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded-lg p-2 bg-gray-50 h-28 focus:ring-orange-500 focus:border-orange-500" placeholder="Descreva o fato gerador da advertência com clareza..."></textarea>
                                    </div>
                                </div>
                            )}

                            {docType === 'suspensao' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Início da Suspensão</label>
                                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-orange-500 focus:border-orange-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Dias</label>
                                            <input type="number" min="1" max="30" value={suspensionDays} onChange={e => setSuspensionDays(parseInt(e.target.value) || 1)} className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-orange-500 focus:border-orange-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Motivo / Observações Detalhadas</label>
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded-lg p-2 bg-gray-50 h-28 focus:ring-orange-500 focus:border-orange-500" placeholder="Descreva os motivos da suspensão com clareza..."></textarea>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                                <Button onClick={() => generatePDF(true)} icon={FileText} className="w-full justify-center bg-gray-100 hover:bg-gray-200 text-gray-700">
                                    Pré-Visualizar Documento
                                </Button>
                                <Button onClick={() => generatePDF(false)} icon={Download} variant="primary" className="bg-orange-600 hover:bg-orange-700 w-full justify-center">
                                    Baixar PDF
                                </Button>
                            </div>

                            <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-xs leading-relaxed border border-blue-100">
                                <strong>Nota Legal:</strong> Todos os documentos gerados possuem embasamento na CLT e espaço reservado para assinaturas das partes (Empregado e Empregador).
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 rounded-xl border border-gray-200 shadow-inner bg-slate-100 overflow-hidden flex flex-col justify-center items-center">
                {pdfPreviewUrl ? (
                    <iframe src={pdfPreviewUrl} className="w-full h-full border-none" title="PDF Preview" />
                ) : (
                    <div className="text-center text-gray-400 flex flex-col items-center gap-4">
                        <FileSignature size={48} className="opacity-20" />
                        <p className="text-sm font-medium">Selecione os dados e clique em Pré-Visualizar</p>
                    </div>
                )}
            </div>
        </div>
    );
};
