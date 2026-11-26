
import { db } from './firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { SupabaseService } from './services/SupabaseService';

const collectionsToMigrate = [
    'companies', 'clients', 'products', 'services',
    'employees', 'partners', 'invoices', 'ncms',
    'taxRates', 'payrollItems', 'payrollRuns',
    'bankAccounts', 'bankTransactions', 'filings',
    'csts', 'cfops', 'units', 'operationTypes',
    'costCenters', 'taxCalendar', 'spedValidations',
    'assets', 'accountingEntries', 'accountingClosures', 'savedReports'
];

async function migrate() {
    console.log('🚀 Iniciando Migração Global: Firebase -> Supabase');

    for (const colName of collectionsToMigrate) {
        try {
            console.log(`--- Migrando coleção: ${colName} ---`);
            const querySnapshot = await getDocs(collection(db, colName));
            // Usamos 'any' aqui para evitar erros de tipagem durante a migração dinâmica
            const docs = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));

            console.log(`📦 Encontrados ${docs.length} documentos em ${colName}`);

            for (const docData of docs) {
                const userId = docData.userId || 'migration_system_user';
                await SupabaseService.saveGenericItem(colName, docData, userId);
            }

            console.log(`✅ Coleção ${colName} finalizada.`);
        } catch (err: any) {
            console.error(`❌ Erro ao migrar ${colName}:`, err?.message || err);
        }
    }

    console.log('🏁 Migração concluída com sucesso!');
}

migrate();
