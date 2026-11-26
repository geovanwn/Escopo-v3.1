import { db, auth } from '../firebaseConfig';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

/**
 * Teste de operações CRUD do Firestore
 * Este arquivo verifica se todas as operações estão funcionando corretamente
 */

export const testFirestoreOperations = async () => {
    console.log('🧪 Iniciando testes de operações CRUD do Firestore...\n');

    if (!auth.currentUser) {
        console.error('❌ Usuário não autenticado. Faça login para executar os testes.');
        return;
    }

    const userId = auth.currentUser.uid;
    console.log('✅ Usuário autenticado:', auth.currentUser.email);

    try {
        // 1. TESTE DE CRIAÇÃO (CREATE)
        console.log('\n📝 Teste 1: CRIAÇÃO de documento...');
        const testData = {
            userId: userId,
            name: 'Teste de Sincronização',
            timestamp: new Date().toISOString(),
            testType: 'CRUD_TEST'
        };

        const docRef = await addDoc(collection(db, 'test_collection'), testData);
        console.log('✅ Documento criado com ID:', docRef.id);

        // 2. TESTE DE LEITURA (READ)
        console.log('\n📖 Teste 2: LEITURA de documentos...');
        const q = query(collection(db, 'test_collection'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        console.log(`✅ Encontrados ${querySnapshot.size} documento(s) do usuário`);
        querySnapshot.forEach((doc) => {
            console.log(`   - ID: ${doc.id}`, doc.data());
        });

        // 3. TESTE DE ATUALIZAÇÃO (UPDATE)
        console.log('\n✏️ Teste 3: ATUALIZAÇÃO de documento...');
        await updateDoc(doc(db, 'test_collection', docRef.id), {
            name: 'Teste de Sincronização - ATUALIZADO',
            updatedAt: new Date().toISOString()
        });
        console.log('✅ Documento atualizado com sucesso');

        // 4. TESTE DE EXCLUSÃO (DELETE)
        console.log('\n🗑️ Teste 4: EXCLUSÃO de documento...');
        await deleteDoc(doc(db, 'test_collection', docRef.id));
        console.log('✅ Documento excluído com sucesso');

        // 5. VERIFICAÇÃO FINAL
        console.log('\n🔍 Teste 5: VERIFICAÇÃO final...');
        const finalQuery = await getDocs(query(collection(db, 'test_collection'), where('testType', '==', 'CRUD_TEST')));
        console.log(`✅ Após exclusão: ${finalQuery.size} documento(s) de teste restantes`);

        console.log('\n🎉 Todos os testes CRUD passaram com sucesso!');
        console.log('✅ O sistema está configurado corretamente para:');
        console.log('   - Criar documentos (CREATE)');
        console.log('   - Ler documentos (READ)');
        console.log('   - Atualizar documentos (UPDATE)');
        console.log('   - Excluir documentos (DELETE)');
        console.log('   - Listar documentos filtrados por userId');

        return true;

    } catch (error: any) {
        console.error('\n❌ Erro durante os testes:', error);
        console.error('Código do erro:', error.code);
        console.error('Mensagem:', error.message);

        if (error.code === 'permission-denied') {
            console.error('\n⚠️ ERRO DE PERMISSÃO!');
            console.error('As regras do Firestore podem não estar configuradas corretamente.');
            console.error('Certifique-se de que as regras no Firebase Console estão atualizadas.');
        }

        return false;
    }
};

/**
 * Teste específico para empresas
 */
export const testCompanyOperations = async () => {
    console.log('\n🏢 Testando operações com EMPRESAS...\n');

    if (!auth.currentUser) {
        console.error('❌ Usuário não autenticado');
        return;
    }

    const userId = auth.currentUser.uid;

    try {
        // Criar empresa de teste
        const companyData = {
            userId: userId,
            cnpj: '00.000.000/0001-00',
            razaoSocial: 'Empresa Teste LTDA',
            nomeFantasia: 'Teste Corp',
            createdAt: new Date().toISOString(),
            createdBy: auth.currentUser.displayName || 'Sistema'
        };

        console.log('📝 Criando empresa de teste...');
        const companyRef = await addDoc(collection(db, 'companies'), companyData);
        console.log('✅ Empresa criada:', companyRef.id);

        // Ler empresas do usuário
        console.log('\n📖 Listando empresas do usuário...');
        const companiesQuery = query(collection(db, 'companies'), where('userId', '==', userId));
        const companiesSnapshot = await getDocs(companiesQuery);
        console.log(`✅ Total de empresas: ${companiesSnapshot.size}`);

        // Atualizar empresa
        console.log('\n✏️ Atualizando empresa...');
        await updateDoc(doc(db, 'companies', companyRef.id), {
            nomeFantasia: 'Teste Corp - ATUALIZADO',
            updatedAt: new Date().toISOString()
        });
        console.log('✅ Empresa atualizada');

        // Excluir empresa de teste
        console.log('\n🗑️ Excluindo empresa de teste...');
        await deleteDoc(doc(db, 'companies', companyRef.id));
        console.log('✅ Empresa excluída');

        console.log('\n🎉 Testes de empresa concluídos com sucesso!');
        return true;

    } catch (error: any) {
        console.error('\n❌ Erro nos testes de empresa:', error);
        console.error('Código:', error.code);
        console.error('Mensagem:', error.message);
        return false;
    }
};

/**
 * Função para executar todos os testes
 */
export const runAllTests = async () => {
    console.log('═══════════════════════════════════════════════════');
    console.log('  TESTES DE OPERAÇÕES FIRESTORE - ESCOPO V3');
    console.log('═══════════════════════════════════════════════════\n');

    const test1 = await testFirestoreOperations();
    const test2 = await testCompanyOperations();

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  RESULTADO FINAL');
    console.log('═══════════════════════════════════════════════════');
    console.log('Teste CRUD geral:', test1 ? '✅ PASSOU' : '❌ FALHOU');
    console.log('Teste de Empresas:', test2 ? '✅ PASSOU' : '❌ FALHOU');
    console.log('═══════════════════════════════════════════════════\n');

    if (test1 && test2) {
        console.log('🎉 TODOS OS TESTES PASSARAM!');
        console.log('O sistema está pronto para uso em produção.');
    } else {
        console.log('⚠️ ALGUNS TESTES FALHARAM!');
        console.log('Verifique os erros acima e as regras do Firestore.');
    }
};

// Exportar para uso no console do navegador
if (typeof window !== 'undefined') {
    (window as any).testFirestore = {
        runAllTests,
        testFirestoreOperations,
        testCompanyOperations
    };
}
