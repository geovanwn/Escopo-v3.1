import { db, auth } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

/**
 * Função para criar dados de teste automaticamente
 * Será executada apenas se o usuário não tiver nenhuma empresa cadastrada
 */
export const createSeedData = async () => {
    if (!auth.currentUser) {
        console.error('❌ Não é possível criar dados de teste: usuário não autenticado');
        return;
    }

    const userId = auth.currentUser.uid;
    const currentUser = auth.currentUser.displayName || 'Usuário Sistema';

    console.log('🌱 Iniciando criação de dados de teste...');

    try {
        // Verificar se já existe alguma empresa
        const companiesQuery = query(collection(db, 'companies'), where('userId', '==', userId));
        const companiesSnapshot = await getDocs(companiesQuery);

        if (!companiesSnapshot.empty) {
            console.log('✅ Usuário já possui empresas cadastradas. Dados de teste não serão criados.');
            return;
        }

        // 1. Criar empresa de exemplo
        console.log('📝 Criando empresa de exemplo...');
        const companyData = {
            userId,
            cnpj: '12.345.678/0001-90',
            razaoSocial: 'Empresa Demonstração LTDA',
            nomeFantasia: 'Demo Corp',
            inscricaoEstadual: '123.456.789.012',
            regimeTributario: '1',
            address: {
                zip: '01310-100',
                street: 'Av. Paulista',
                number: '1000',
                complemento: 'Sala 101',
                neighborhood: 'Bela Vista',
                city: 'São Paulo',
                uf: 'SP'
            },
            email: 'contato@democorp.com.br',
            telefone: '(11) 3000-0000',
            atividadePrincipal: 'Consultoria em Gestão Empresarial',
            createdBy: currentUser,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        const companyRef = await addDoc(collection(db, 'companies'), companyData);
        const companyId = companyRef.id;
        console.log(`✅ Empresa criada com ID: ${companyId}`);

        // 2. Criar alguns clientes de exemplo
        console.log('📝 Criando clientes de exemplo...');
        const clientsData = [
            {
                userId,
                companyId,
                name: 'João Silva',
                cpfCnpj: '123.456.789-00',
                email: 'joao@email.com',
                phone: '(11) 98765-4321',
                type: 'Pessoa Física',
                createdBy: currentUser,
                createdAt: new Date().toISOString()
            },
            {
                userId,
                companyId,
                name: 'Maria Santos Comércio ME',
                cpfCnpj: '98.765.432/0001-10',
                email: 'maria@comercio.com.br',
                phone: '(11) 97654-3210',
                type: 'Pessoa Jurídica',
                createdBy: currentUser,
                createdAt: new Date().toISOString()
            }
        ];

        for (const client of clientsData) {
            await addDoc(collection(db, 'clients'), client);
        }
        console.log(`✅ ${clientsData.length} clientes criados`);

        // 3. Criar alguns produtos de exemplo
        console.log('📝 Criando produtos de exemplo...');
        const productsData = [
            {
                userId,
                companyId,
                name: 'Serviço de Consultoria',
                code: 'SRV-001',
                price: 1500.00,
                unit: 'UN',
                type: 'Serviço',
                icmsRate: 0,
                pisRate: 0,
                cofinsRate: 0,
                createdBy: currentUser,
                createdAt: new Date().toISOString()
            },
            {
                userId,
                companyId,
                name: 'Produto Demonstração',
                code: 'PRD-001',
                price: 250.00,
                unit: 'UN',
                type: 'Produto',
                icmsRate: 18,
                pisRate: 1.65,
                cofinsRate: 7.6,
                createdBy: currentUser,
                createdAt: new Date().toISOString()
            }
        ];

        for (const product of productsData) {
            await addDoc(collection(db, 'products'), product);
        }
        console.log(`✅ ${productsData.length} produtos criados`);

        // 4. Criar algumas notas fiscais de exemplo
        console.log('📝 Criando notas fiscais de exemplo...');
        const today = new Date();
        const invoicesData = [
            {
                userId,
                companyId,
                number: 'NF-001',
                type: 'exit',
                entityName: 'João Silva',
                date: today.toISOString().split('T')[0],
                value: 1500.00,
                taxValue: 225.00,
                status: 'paga',
                createdBy: currentUser,
                createdAt: new Date().toISOString()
            },
            {
                userId,
                companyId,
                number: 'NF-002',
                type: 'service',
                entityName: 'Maria Santos Comércio ME',
                date: today.toISOString().split('T')[0],
                value: 2500.00,
                taxValue: 375.00,
                status: 'aberta',
                createdBy: currentUser,
                createdAt: new Date().toISOString()
            }
        ];

        for (const invoice of invoicesData) {
            await addDoc(collection(db, 'invoices'), invoice);
        }
        console.log(`✅ ${invoicesData.length} notas fiscais criadas`);

        // 5. Criar uma conta bancária de exemplo
        console.log('📝 Criando conta bancária de exemplo...');
        const bankAccountData = {
            userId,
            companyId,
            bankName: 'Banco do Brasil',
            accountNumber: '12345-6',
            agency: '0001',
            balance: 10000.00,
            type: 'Conta Corrente',
            createdBy: currentUser,
            createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'bankAccounts'), bankAccountData);
        console.log('✅ Conta bancária criada');

        // 6. Criar tipos de operação (Naturezas) padrão
        console.log('📝 Criando naturezas de operação...');
        const operationTypesData = [
            { userId, name: 'Venda de Mercadoria', description: 'Venda de mercadorias adquiridas ou recebidas de terceiros' },
            { userId, name: 'Prestação de Serviço', description: 'Prestação de serviços sujeitos ao ISS ou ICMS' },
            { userId, name: 'Compra para Comercialização', description: 'Compra de mercadorias para serem comercializadas' },
            { userId, name: 'Devolução de Mercadoria', description: 'Devolução de compras ou vendas' },
            { userId, name: 'Remessa para Conserto', description: 'Remessa de bens para manutenção ou reparo' },
            { userId, name: 'Retorno de Conserto', description: 'Retorno de bens recebidos para manutenção' },
            { userId, name: 'Remessa para Demonstração', description: 'Remessa de mercadorias para exibição e testes' },
            { userId, name: 'Transferência de Mercadoria', description: 'Transferência entre estabelecimentos da mesma empresa' }
        ];

        for (const opType of operationTypesData) {
            await addDoc(collection(db, 'operationTypes'), opType);
        }
        console.log(`✅ ${operationTypesData.length} naturezas de operação criadas`);

        console.log('🎉 Dados de teste criados com sucesso!');
        console.log(`📊 Resumo:
    - 1 Empresa
    - ${clientsData.length} Clientes
    - ${productsData.length} Produtos
    - ${invoicesData.length} Notas Fiscais
    - 1 Conta Bancária
    `);

    } catch (error) {
        console.error('❌ Erro ao criar dados de teste:', error);
        throw error;
    }
};

/**
 * Função para verificar se o usuário precisa de dados de teste
 */
export const checkAndCreateSeedData = async () => {
    if (!auth.currentUser) return;

    try {
        const userId = auth.currentUser.uid;
        const companiesQuery = query(collection(db, 'companies'), where('userId', '==', userId));
        const companiesSnapshot = await getDocs(companiesQuery);

        if (companiesSnapshot.empty) {
            console.log('⚠️ Nenhuma empresa encontrada. Criando dados de teste...');
            await createSeedData();
        }
    } catch (error) {
        console.error('❌ Erro ao verificar necessidade de dados de teste:', error);
    }
};
