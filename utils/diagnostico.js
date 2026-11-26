// DIAGNÓSTICO: Sistema não está buscando dados do Firestore
// Cole este código no console do navegador (F12) para diagnosticar

console.log('='.repeat(60));
console.log('🔍 DIAGNÓSTICO DO SISTEMA - ESCOPO V3');
console.log('='.repeat(60));

// 1. Verificar autenticação
console.log('\n1️⃣ VERIFICANDO AUTENTICAÇÃO...');
import { auth } from './firebaseConfig';
const currentUser = auth.currentUser;

if (currentUser) {
    console.log('✅ Usuário autenticado:');
    console.log('   - Email:', currentUser.email);
    console.log('   - UID:', currentUser.uid);
    console.log('   - Display Name:', currentUser.displayName);
} else {
    console.log('❌ PROBLEMA: Nenhum usuário autenticado!');
    console.log('   SOLUÇÃO: Faça login na tela de login');
}

// 2. Verificar dados existentes na base
console.log('\n2️⃣ VERIFICANDO DADOS NO FIRESTORE...');
import { db } from './firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

if (currentUser) {
    // Verificar empresas
    const companiesRef = collection(db, 'companies');
    const companiesQuery = query(companiesRef, where('userId', '==', currentUser.uid));

    getDocs(companiesQuery).then(snapshot => {
        console.log('📊 EMPRESAS:');
        console.log('   - Total encontrado:', snapshot.size);
        snapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(`   - Empresa ${index + 1}:`, {
                id: doc.id,
                nome: data.nomeFantasia || data.razaoSocial,
                userId: data.userId,
                match: data.userId === currentUser.uid ? '✅' : '❌'
            });
        });

        if (snapshot.empty) {
            console.log('   ⚠️ NENHUMA EMPRESA ENCONTRADA!');
        }
    }).catch(error => {
        console.error('   ❌ ERRO ao buscar empresas:', error.message);
        if (error.code === 'permission-denied') {
            console.error('   🔒 PROBLEMA DE PERMISSÃO!');
            console.error('   As regras do Firestore podem não estar publicadas.');
        }
    });

    // Verificar clientes
    const clientsRef = collection(db, 'clients');
    const clientsQuery = query(clientsRef, where('userId', '==', currentUser.uid));

    getDocs(clientsQuery).then(snapshot => {
        console.log('\n📊 CLIENTES:');
        console.log('   - Total encontrado:', snapshot.size);
        if (snapshot.empty) {
            console.log('   ⚠️ Nenhum cliente encontrado');
        }
    }).catch(error => {
        console.error('   ❌ ERRO ao buscar clientes:', error.message);
    });

    // Verificar produtos
    const productsRef = collection(db, 'products');
    const productsQuery = query(productsRef, where('userId', '==', currentUser.uid));

    getDocs(productsQuery).then(snapshot => {
        console.log('\n📊 PRODUTOS:');
        console.log('   - Total encontrado:', snapshot.size);
        if (snapshot.empty) {
            console.log('   ⚠️ Nenhum produto encontrado');
        }
    }).catch(error => {
        console.error('   ❌ ERRO ao buscar produtos:', error.message);
    });
}

// 3. Verificar dados SEM filtro de userId (para debug)
console.log('\n3️⃣ VERIFICANDO DADOS TOTAIS (SEM FILTRO)...');
console.log('   ⚠️ Isto pode mostrar dados de outros usuários também');

const allCompaniesRef = collection(db, 'companies');
getDocs(allCompaniesRef).then(snapshot => {
    console.log('📊 TOTAL DE EMPRESAS NA BASE (TODOS OS USUÁRIOS):', snapshot.size);

    if (snapshot.size > 0) {
        console.log('   Empresas encontradas:');
        snapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(`   ${index + 1}.`, {
                id: doc.id,
                nome: data.nomeFantasia || data.razaoSocial,
                userId: data.userId,
                temUserId: !!data.userId,
                matchComUsuarioAtual: currentUser ? (data.userId === currentUser.uid) : 'N/A'
            });
        });
    } else {
        console.log('   ⚠️ NÃO EXISTEM EMPRESAS NO FIRESTORE!');
        console.log('   A base de dados está completamente vazia.');
    }
}).catch(error => {
    console.error('   ❌ ERRO:', error.message);
    if (error.code === 'permission-denied') {
        console.error('   🔒 REGRAS DO FIRESTORE BLOQUEANDO ACESSO!');
        console.error('   Você precisa publicar as novas regras no Firebase Console.');
    }
});

// 4. Teste de permissões
console.log('\n4️⃣ TESTANDO PERMISSÕES...');
if (currentUser) {
    import { addDoc } from 'firebase/firestore';

    const testData = {
        userId: currentUser.uid,
        testField: 'Teste de permissão',
        timestamp: new Date().toISOString()
    };

    addDoc(collection(db, 'test_permission'), testData)
        .then(docRef => {
            console.log('✅ PERMISSÃO DE CRIAÇÃO: OK');
            console.log('   Documento de teste criado:', docRef.id);
        })
        .catch(error => {
            console.error('❌ PERMISSÃO DE CRIAÇÃO: BLOQUEADA');
            console.error('   Erro:', error.message);
            console.error('   Código:', error.code);
        });
}

console.log('\n' + '='.repeat(60));
console.log('📋 RESUMO DO DIAGNÓSTICO');
console.log('='.repeat(60));
console.log('Aguarde alguns segundos para ver os resultados acima...');
console.log('Se houver erros de permissão, publique as regras no Firebase Console.');
console.log('='.repeat(60));
