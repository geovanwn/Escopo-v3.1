import { supabase } from '../supabaseClient';
import { CompanyEntity } from '../types';

export const SupabaseService = {
    async saveGenericItem(table: string, item: any, userId: string) {
        // Converte o nome da tabela para snake_case (ex: bankAccounts -> bank_accounts)
        const targetTable = table.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

        const { id, companyId } = item;

        const dataToSave: any = {
            id: id || undefined,
            user_id: userId,
            data: item, // Salva o documento completo como JSONB
            updated_at: new Date().toISOString()
        };

        const compId = companyId || item.companyId;
        if (compId) {
            dataToSave.company_id = compId;
        }

        console.log(`📡 Enviando dados para a tabela Supabase: ${targetTable}...`);

        const { data, error } = await supabase
            .from(targetTable)
            .upsert(dataToSave);

        if (error) {
            console.error(`❌ Erro no Supabase [${targetTable}]:`, error.message);
            console.error(`Dica do Banco: ${error.hint || 'Sem dicas'}`);
            throw error;
        }

        return data;
    },

    async saveCompany(company: CompanyEntity, userId: string) {
        return this.saveGenericItem('companies', company, userId);
    },

    async deleteGenericItem(table: string, id: string) {
        const targetTable = table.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        console.log(`📡 Excluindo dados na tabela Supabase: ${targetTable}...`);
        const { data, error } = await supabase
            .from(targetTable)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`❌ Erro no Supabase ao deletar [${targetTable}]:`, error.message);
            throw error;
        }

        return data;
    }
};
