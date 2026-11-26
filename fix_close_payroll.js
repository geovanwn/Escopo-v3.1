const fs = require('fs');
let content = fs.readFileSync('pages/Payroll.tsx', 'utf8');

const startIdx = content.indexOf('    const handleClosePayroll');
const endIdx = content.indexOf('\n    const formatCurrency', startIdx + 100);

if (startIdx === -1) { console.error('START NOT FOUND'); process.exit(1); }
if (endIdx === -1) { console.error('END NOT FOUND'); process.exit(1); }

console.log('Found function at', startIdx, '-', endIdx);

const newFn = `    const handleClosePayroll = async () => {
        if (!auth.currentUser) {
            showError({ code: 'ERR_AUTH', title: 'Não Autenticado', description: 'Faça login novamente.', origin: 'Fechar Folha', suggestion: 'Efetue login e tente novamente.' });
            return;
        }
        if (!selectedCompany) {
            showError({ code: 'ERR_NO_COMPANY', title: 'Empresa Não Selecionada', description: 'Selecione uma empresa antes de fechar a folha.', origin: 'Fechar Folha', suggestion: 'Selecione a empresa no menu superior.' });
            return;
        }
        if (people.length === 0) {
            showError({ code: 'ERR_NO_PEOPLE', title: 'Sem Colaboradores', description: 'Não há pessoas para processar.', origin: 'Fechar Folha', suggestion: 'Cadastre colaboradores antes de fechar a folha.' });
            return;
        }
        const msg = 'Fechar folha de ' + currentCompetence + ' para ' + people.length + ' pessoa(s)?\\n\\nIsso vai gerar lançamentos no Financeiro.';
        if (!window.confirm(msg)) return;

        setIsProcessing(true);
        try {
            const userId = auth.currentUser.uid;
            const companyId = selectedCompany.id;
            const now = new Date().toISOString();

            const details = summaryList.map((item: any) => ({
                employeeId: item.person.id,
                employeeName: item.person.name,
                personType: item.person.type === 'employee' ? 'employee' : 'partner',
                role: item.person.role || '',
                competence: currentCompetence,
                baseSalary: item.events.find((e: any) => e.description === 'Salário Base' || e.description === 'Pró-Labore')?.value || 0,
                events: item.events,
                totalProventos: item.totalProventos || 0,
                totalDescontos: item.totalDescontos || 0,
                netSalary: item.netSalary || 0,
                baseINSS: item.baseINSS || 0,
                baseFGTS: item.baseFGTS || 0,
                baseIRRF: item.baseIRRF || 0,
                fgtsValue: item.fgtsValue || 0,
                inssValue: item.events.find((e: any) => e.description && e.description.includes('INSS'))?.value || 0,
                irrfValue: item.events.find((e: any) => e.description && e.description.includes('IRRF'))?.value || 0
            }));

            const safeDetails = JSON.parse(JSON.stringify(details));

            const runPayload = {
                userId, companyId,
                competence: currentCompetence,
                calculationType: 'folha_mensal',
                status: 'fechado',
                totalGross: details.reduce((a: number, d: any) => a + (d.totalProventos || 0), 0),
                totalNet: details.reduce((a: number, d: any) => a + (d.netSalary || 0), 0),
                totalTaxes: details.reduce((a: number, d: any) => a + (d.inssValue || 0) + (d.irrfValue || 0), 0),
                employeeCount: details.length,
                details: safeDetails,
                closedAt: now, createdAt: now,
                createdBy: currentUser, createdBy_id: userId
            };

            const runRef = await addDoc(collection(db, 'payrollRuns'), runPayload);
            const runId = runRef.id;

            // Parse competence MM/YYYY → payment dates
            const parts = currentCompetence.split('/');
            const compMonth = parseInt(parts[0], 10);
            const compYear = parseInt(parts[1], 10);
            const payDateStr = new Date(compYear, compMonth, 5).toISOString().split('T')[0];
            const taxDateStr = new Date(compYear, compMonth, 20).toISOString().split('T')[0];

            const base = {
                userId, companyId,
                type: 'payroll', status: 'pendente',
                createdAt: now, createdBy: currentUser, createdBy_id: userId
            };

            for (const d of safeDetails) {
                const s = runId.substring(0, 4);
                const em = (d.employeeId || 'xxx').substring(0, 3);

                if ((d.netSalary || 0) > 0) {
                    await addDoc(collection(db, 'invoices'), {
                        ...base,
                        number: 'FOLHA-' + s + '-' + em,
                        entityName: d.employeeName, entityId: d.employeeId,
                        cnpj: '', date: payDateStr, value: d.netSalary,
                        category: 'Salários',
                        details: 'Salário Líquido - ' + currentCompetence + ' (' + (d.personType === 'partner' ? 'Pró-Labore' : 'CLT') + ')'
                    });
                }
                if ((d.inssValue || 0) > 0) {
                    await addDoc(collection(db, 'invoices'), {
                        ...base,
                        number: 'INSS-' + s + '-' + em,
                        entityName: 'Receita Federal (INSS)', entityId: 'gov-inss',
                        cnpj: '00360305000104', date: taxDateStr, value: d.inssValue,
                        category: 'Impostos - Trabalhista',
                        details: 'INSS - ' + d.employeeName + ' - ' + currentCompetence
                    });
                }
                if ((d.fgtsValue || 0) > 0) {
                    await addDoc(collection(db, 'invoices'), {
                        ...base,
                        number: 'FGTS-' + s + '-' + em,
                        entityName: 'Caixa Econômica Federal (FGTS)', entityId: 'gov-fgts',
                        cnpj: '00360305000104', date: taxDateStr, value: d.fgtsValue,
                        category: 'Impostos - Trabalhista',
                        details: 'FGTS - ' + d.employeeName + ' - ' + currentCompetence
                    });
                }
                if ((d.irrfValue || 0) > 0) {
                    await addDoc(collection(db, 'invoices'), {
                        ...base,
                        number: 'IRRF-' + s + '-' + em,
                        entityName: 'Receita Federal (IRRF)', entityId: 'gov-irrf',
                        cnpj: '00394460000141', date: taxDateStr, value: d.irrfValue,
                        category: 'Impostos - Trabalhista',
                        details: 'IRRF - ' + d.employeeName + ' - ' + currentCompetence
                    });
                }
            }

            setViewMode('list');
            setAllMovements({});
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 4000);

        } catch (error: any) {
            console.error('Erro ao fechar folha:', error);
            showError({
                code: 'ERR_CLOSE_001',
                title: 'Erro ao Fechar Folha',
                description: (error.message || 'Falha desconhecida') + (error.code ? ' [' + error.code + ']' : ''),
                origin: 'Fechar Folha',
                suggestion: 'Verifique conexão e permissões do Firebase.'
            });
        } finally {
            setIsProcessing(false);
        }
    }`;

const newContent = content.substring(0, startIdx) + newFn + content.substring(endIdx);
fs.writeFileSync('pages/Payroll.tsx', newContent, 'utf8');
console.log('Done! handleClosePayroll replaced successfully.');
