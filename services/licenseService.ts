import axios from 'axios';

// URL do serviço de validação de licença
// IMPORTANTE: Substitua pela URL real do seu backend
const LICENSE_API_URL = 'https://api.seusistema.com/v1/license/verify';
const APP_ID = 'escopo-admin-v3';

// MODO DE SIMULAÇÃO (MOCK) - Deixe true enquanto não tiver a API real
const USE_MOCK = true;

export interface LicenseResponse {
    active: boolean;
    plan?: string;
    expirationDate?: string;
    message?: string;
    reason?: string;
}

/**
 * Verifica a licença do usuário junto ao sistema externo.
 * @param uid ID do usuário no Firebase
 * @param email Email do usuário
 * @param token Token de autenticação do Firebase (Opcional, mas recomendado)
 */
export const verifyLicense = async (uid: string, email: string | null, token?: string): Promise<LicenseResponse> => {
    if (!email) {
        return { active: false, message: 'Email é obrigatório para validação de licença.' };
    }

    // Bypass para desenvolvimento/teste
    if (USE_MOCK) {
        console.warn("⚠️ MODO MOCK ATIVADO: Simulando licença válida.");
        return new Promise(resolve => setTimeout(() => resolve({
            active: true,
            plan: 'premium',
            expirationDate: '2099-12-31T23:59:59Z',
            message: 'Licença válida (Simulação).'
        }), 800));
    }

    try {
        const headers: any = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.post<LicenseResponse>(LICENSE_API_URL, {
            uid,
            email,
            appId: APP_ID,
            timestamp: Date.now()
        }, {
            headers,
            timeout: 10000 // 10 segundos timeout
        });

        return response.data;
    } catch (error: any) {
        console.error("Erro na validação de licença:", error);

        // Tratar resposta de erro da API (Ex: 403 Forbidden)
        if (error.response && error.response.data) {
            return error.response.data as LicenseResponse;
        }

        // Erro de rede ou servidor indisponível
        // Estratégia: Fail Secure (Bloquear se não conseguir validar) ou Fail Safe (Permitir se offline)?
        // Geralmente Fail Secure para licenças.
        return {
            active: false,
            message: 'Não foi possível conectar ao servidor de licenças. Verifique sua conexão com a internet.'
        };
    }
};
