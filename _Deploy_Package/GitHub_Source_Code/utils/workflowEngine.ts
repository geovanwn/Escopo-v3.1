import { Invoice, WorkflowTask, Filing } from '../types';

export const generateWorkflowAutomations = (
    invoices: Invoice[],
    filings: Filing[]
): Omit<WorkflowTask, 'id' | 'companyId'>[] => {
    const newTasks: Omit<WorkflowTask, 'id' | 'companyId'>[] = [];
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // 1. Check Overdue Invoices
    const overdueInvoices = invoices.filter(inv =>
        inv.status === 'pendente' &&
        new Date(inv.date) < today &&
        inv.type === 'entry' // Contas a Pagar
    );

    if (overdueInvoices.length > 0) {
        newTasks.push({
            title: `Contas a Pagar em Atraso (${overdueInvoices.length})`,
            description: `Existem ${overdueInvoices.length} contas vencidas que precisam de atenção. Valor total: R$ ${overdueInvoices.reduce((acc, i) => acc + i.value, 0).toFixed(2)}`,
            assignedTo: 'fiscal-team',
            status: 'todo',
            priority: 'high',
            dueDate: today.toISOString().split('T')[0],
            tags: ['financeiro', 'atraso']
        });
    }

    // 2. Check Tax Deadlines
    const pendingFilings = filings.filter(f =>
        (f.status === 'not_started' || f.status === 'pending') &&
        new Date(f.deadline) <= nextWeek
    );

    pendingFilings.forEach(filing => {
        const deadlineDate = new Date(filing.deadline);
        const daysLeft = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        newTasks.push({
            title: `Entrega de Obrigação: ${filing.name}`,
            description: `A declaração ${filing.name} vence em ${daysLeft} dias (${filing.deadline}).`,
            assignedTo: 'fiscal-team',
            status: 'todo',
            priority: daysLeft <= 2 ? 'urgent' : 'high',
            dueDate: filing.deadline,
            tags: ['fiscal', 'prazo']
        });
    });

    return newTasks;
};
