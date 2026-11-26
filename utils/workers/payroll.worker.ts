import { calculatePayroll } from '../payrollEngine';
import { Employee, Partner, PayrollInputState } from '../../types';

self.onmessage = (e: MessageEvent) => {
    const { action, payload } = e.data;

    try {
        if (action === 'CALCULATE_BATCH') {
            const { targets, inputsMap, payrollItems, competenceDateStr } = payload;
            const competenceDate = new Date(competenceDateStr);
            const results = [];

            for (const p of targets) {
                let pInputs = inputsMap[p.id];
                if (!pInputs) {
                    if (p.type === 'employee') {
                        const emp = p as Employee;
                        pInputs = {
                            he50_qtde: 0, he100_qtde: 0, faltas_dias: 0, atrasos_mins: 0, comissao_valor: 0, bonus_valor: 0,
                            adicional_periculosidade: false, adicional_insalubridade: 'nenhum',
                            desc_vt: emp.transportVoucher || false, desc_plano_saude: emp.healthPlan ? 150 : 0,
                            desc_adiantamento: 0, desc_outros: 0, customEvents: [],
                            selectedRubrics: ['1001', '5001', '5002']
                        };
                    } else {
                        const part = p as Partner;
                        pInputs = {
                            he50_qtde: 0, he100_qtde: 0, faltas_dias: 0, atrasos_mins: 0, comissao_valor: 0, bonus_valor: 0,
                            adicional_periculosidade: false, adicional_insalubridade: 'nenhum',
                            desc_vt: false, desc_plano_saude: 0, desc_adiantamento: 0, desc_outros: 0,
                            proLaboreOverride: part.proLaboreValue || 1412.00, customEvents: [],
                            selectedRubrics: ['1002', '5001']
                        };
                    }
                }
                
                try {
                    const inputsWithYear = { ...pInputs, year: competenceDate.getFullYear().toString() };
                    const sim = calculatePayroll(p, inputsWithYear, payrollItems);
                    results.push(sim);
                } catch (err) {
                    // Skip invalid
                }
            }

            self.postMessage({ type: 'BATCH_RESULT', results });
        }
    } catch (error: any) {
        self.postMessage({ type: 'ERROR', error: error.message });
    }
};
