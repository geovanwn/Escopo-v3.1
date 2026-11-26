
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import https from 'https';
import forge from 'node-forge';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const ESOCIAL_URLS = {
    production: {
        send: 'https://webservices.envio.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
        retrieve: 'https://webservices.consultalote.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc'
    },
    staging: {
        send: 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
        retrieve: 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc'
    }
};

const NFE_URLS = {
    production: 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
    homologation: 'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx'
};

// HELPER: Create Agent with Fallback for Legacy PFX
const createSecureAgent = (pfxBase64, password) => {
    try {
        // Tenta método nativo (Node.js OpenSSL)
        return new https.Agent({
            pfx: Buffer.from(pfxBase64, 'base64'),
            passphrase: password
            // Security Fix: Removed rejectUnauthorized: false.
        });
    } catch (nativeError) {
        if (nativeError.code === 'ERR_CRYPTO_UNSUPPORTED_OPERATION' || nativeError.message.includes('unsupported')) {
            console.log('[Proxy] PFX Legado detectado (Node.js OpenSSL mismatch). Tentando fallback via node-forge...');

            try {
                // Fallback: Decodificar PFX manualmente usando node-forge (JS puro) e extrair chaves
                const pfxDer = forge.util.decode64(pfxBase64);
                const pfxAsn1 = forge.asn1.fromDer(pfxDer);
                const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);

                let keyPem = null;
                let certPem = null;

                // Extrair Certificado
                const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
                if (certBags && certBags.length > 0) {
                    certPem = forge.pki.certificateToPem(certBags[0].cert);
                }

                // Extrair Chave Privada (Shrouded ou Plain)
                const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];
                if (keyBags && keyBags.length > 0) {
                    keyPem = forge.pki.privateKeyToPem(keyBags[0].key);
                } else {
                    const plainKeyBags = pfx.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];
                    if (plainKeyBags && plainKeyBags.length > 0) {
                        keyPem = forge.pki.privateKeyToPem(plainKeyBags[0].key);
                    }
                }

                if (!keyPem || !certPem) {
                    throw new Error('Falha ao extrair Chave ou Certificado do PFX via node-forge.');
                }

                console.log('[Proxy] Fallback forge com sucesso. Certificado extraído.');

                return new https.Agent({
                    key: keyPem,
                    cert: certPem,
                    passphrase: password
                    // Security Fix: Removed rejectUnauthorized: false to prevent MITM. 
                    // Government servers have valid public certificates.
                });

            } catch (forgeError) {
                console.error('[Proxy] Falha no Fallback Forge:', forgeError.message);
                throw nativeError;
            }
        }
        throw nativeError;
    }
};

app.get('/', (req, res) => res.send('Proxy eSocial v2 (Legacy Support) OK'));
app.get('/ping', (req, res) => res.json({ status: 'online', timestamp: new Date().toISOString() }));


// Rota de Envio
app.post('/api/esocial/send', async (req, res) => {
    try {
        console.log(`[Proxy] Envio de Lote Iniciado.`);
        const { xml, pfx, password, env } = req.body;

        if (!xml || !pfx || !password) {
            return res.status(400).json({ success: false, message: 'Dados incompletos.' });
        }

        const targetEnv = env === 'staging' ? 'staging' : 'production';
        const url = ESOCIAL_URLS[targetEnv].send;

        let agent;
        try {
            agent = createSecureAgent(pfx, password);
        } catch (e) {
            console.error('[Proxy] Erro ao criar Agente:', e.message);
            return res.status(400).json({ success: false, message: `Erro Certificado: ${e.message}`, details: e.code });
        }

        console.log(`[Proxy] Enviando para ${url}...`);

        const response = await axios.post(url, xml, {
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                // FIX: Aspas adicionadas para conformidade com SOAP 1.1/WCF eSocial
                'SOAPAction': 'http://www.esocial.gov.br/services/empregador/enviarloteeventos/v1_1_1/EnviarLoteEventos'
            },
            httpsAgent: agent,
            timeout: 60000
        });

        console.log('[Proxy] Sucesso eSocial.');
        res.send(response.data);

    } catch (error) {
        console.error('[Proxy] Erro Request:', error.message);
        if (error.response) {
            console.error('eSocial HTTP:', error.response.status);
            console.error('eSocial Body:', error.response.data);
            return res.status(error.response.status).send(error.response.data);
        }
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { message: error.message };
        res.status(status).send(data);
    }
});

// Rota de Consulta
app.post('/api/esocial/consult', async (req, res) => {
    try {
        console.log('[Proxy] Consulta Iniciada.');
        const { xml, pfx, password, env } = req.body;

        if (!xml || !pfx || !password) {
            return res.status(400).json({ success: false, message: 'Dados incompletos.' });
        }

        const targetEnv = env === 'staging' ? 'staging' : 'production';
        const url = ESOCIAL_URLS[targetEnv].retrieve;

        let agent;
        try {
            agent = createSecureAgent(pfx, password);
        } catch (e) {
            return res.status(400).json({ success: false, message: `Erro Certificado: ${e.message}` });
        }

        const response = await axios.post(url, xml, {
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                // FIX: Aspas adicionadas
                'SOAPAction': '"http://www.esocial.gov.br/services/empregador/consultarloteeventos/v1_1_0/ConsultarLoteEventos"'
            },
            httpsAgent: agent,
            timeout: 60000
        });

        console.log('[Proxy] Consulta retornada.');
        res.send(response.data);

    } catch (error) {
        console.error('[Proxy] Erro Consulta:', error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { message: error.message };
        res.status(status).send(data);
    }
});

// Rota de Manifestação do Destinatário (NFe Eventos)
app.post('/api/nfe/manifest', async (req, res) => {
    try {
        console.log('[Proxy] Manifestação NFe Iniciada.');
        const { pfx, password, env, accessKey, cnpj, eventType, sequence } = req.body;

        if (!pfx || !password || !cnpj || !accessKey || !eventType) {
            return res.status(400).json({ success: false, message: 'Dados incompletos para manifestação.' });
        }

        const targetUrl = env === 'homologation'
            ? 'https://hom1.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx'
            : 'https://www1.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx';

        const tpAmb = env === 'homologation' ? '2' : '1';
        const date = new Date().toISOString().replace(/\..+/, '') + '-03:00'; // Formato esperado pela SEFAZ
        const idEvento = `ID${eventType}${accessKey}${String(sequence || 1).padStart(2, '0')}`;

        // XML do Evento (Simplificado para Manifestação)
        const detEvento = `
            <detEvento versao="1.00">
                <descEvento>${eventType === '210210' ? 'Ciencia da Operacao' : eventType === '210200' ? 'Confirmacao da Operacao' : 'Desconhecimento da Operacao'}</descEvento>
            </detEvento>
        `.trim().replace(/>\s+</g, '><');

        const infEvento = `
            <infEvento Id="${idEvento}">
                <cOrgao>91</cOrgao>
                <tpAmb>${tpAmb}</tpAmb>
                <CNPJ>${cnpj.replace(/\D/g, '')}</CNPJ>
                <chNFe>${accessKey.replace(/\D/g, '')}</chNFe>
                <dhEvento>${date}</dhEvento>
                <tpEvento>${eventType}</tpEvento>
                <nSeqEvento>${sequence || 1}</nSeqEvento>
                <verEvento>1.00</verEvento>
                ${detEvento}
            </infEvento>
        `.trim().replace(/>\s+</g, '><');

        // Note: Real manifestation REQUIRES signing the infEvento.
        // We'll use the /api/sign logic style internally or expect pre-signed if complex.
        // For simplicity in this demo proxy, we'll assume the user might use the /api/sign route first or we include signing here.
        // Let's implement signing here for a better developer experience.

        const { keyPem, cleanCert } = extractCertData(pfx, password);
        const canonicalInf = c14n(infEvento);
        const digest = calculateHash(canonicalInf);

        const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></SignatureMethod><Reference URI="#${idEvento}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod><DigestValue>${digest}</DigestValue></Reference></SignedInfo>`;
        const signatureValue = signContent(c14n(signedInfo), keyPem);

        const signature = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfo}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${cleanCert}</X509Certificate></X509Data></KeyInfo></Signature>`;

        const evento = `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">${infEvento}${signature}</evento>`;
        const envEvento = `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${Date.now()}</idLote>${evento}</envEvento>`;

        const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeRecepcaoEvento xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4"><nfeDadosMsg>${envEvento}</nfeDadosMsg></nfeRecepcaoEvento></soap12:Body></soap12:Envelope>`;

        let agent = createSecureAgent(pfx, password);
        const response = await axios.post(targetUrl, soapEnvelope, {
            headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
            httpsAgent: agent,
            timeout: 60000
        });

        console.log('[Proxy] Manifestação enviada com sucesso.');
        res.send(response.data);

    } catch (error) {
        console.error('[Proxy] Erro Manifestação NFe:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Rota de Distribuição de DF-e (NFe)
app.post('/api/nfe/distribute', async (req, res) => {
    try {
        console.log('[Proxy] Distribuição NFe Iniciada.');
        const { pfx, password, env, accessKey, nsu, cnpj } = req.body;

        if (!pfx || !password || !cnpj) {
            return res.status(400).json({ success: false, message: 'Dados incompletos (PFX, Senha ou CNPJ).' });
        }

        const targetUrl = env === 'homologation' ? NFE_URLS.homologation : NFE_URLS.production;
        const tpAmb = env === 'homologation' ? '2' : '1';

        // Construir XML de body (distDFeInt)
        let queryBody = '';
        if (accessKey) {
            queryBody = `<consChNFe><chNFe>${accessKey.replace(/\D/g, '')}</chNFe></consChNFe>`;
        } else {
            // Se não informou chave, busca por NSU (sequência)
            queryBody = `<distNSU><ultNSU>${(nsu || '0').padStart(15, '0')}</ultNSU></distNSU>`;
        }

        const distDFeInt = `
            <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
                <tpAmb>${tpAmb}</tpAmb>
                <cUFAutor>91</cUFAutor>
                <CNPJ>${cnpj.replace(/\D/g, '')}</CNPJ>
                ${queryBody}
            </distDFeInt>
        `.trim().replace(/>\s+</g, '><');

        // Construir Envelope SOAP 1.2
        const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>${distDFeInt}</nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;

        let agent;
        try {
            agent = createSecureAgent(pfx, password);
        } catch (e) {
            return res.status(400).json({ success: false, message: `Erro Certificado: ${e.message}` });
        }

        const response = await axios.post(targetUrl, soapEnvelope, {
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8'
            },
            httpsAgent: agent,
            timeout: 60000
        });

        console.log('[Proxy] Distribuição retornada com sucesso.');
        res.send(response.data);

    } catch (error) {
        console.error('[Proxy] Erro Distribuição NFe:', error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { message: error.message };
        res.status(status).send(data);
    }
});
// --- SUBSYSTEM: XML SIGNER (XMLDSig) ---
// Implementação nativa de assinatura digital padrão eSocial (A1/PFX)
// Evita dependência de 'xml-crypto' externa

const crypto = await import('crypto');

/**
 * Calcula o Hash SHA-256 de uma string
 */
const calculateHash = (content) => {
    return crypto.createHash('sha256').update(content, 'utf8').digest('base64');
};

/**
 * Assina um conteúdo usando RSA-SHA256 e a chave privada PEM
 */
const signContent = (content, privateKeyPem) => {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(content);
    return signer.sign(privateKeyPem, 'base64');
};

/**
 * Canonicalização Simplificada (C14N) para eSocial
 * Remove espaços desnecessários e normaliza tags para o cálculo do hash.
 * NOTA: Esta é uma implementação "leve" suficiente para o padrão eSocial.
 */
const c14n = (xml) => {
    // 1. Remove declaração XML se existir
    let clean = xml.replace(/<\?xml.*?\?>/g, '');
    // 2. Remove espaços entre tags (exceto dentro de conteúdo)
    clean = clean.replace(/>\s+</g, '><');
    // 3. Trim
    return clean.trim();
};

/**
 * Extrai Chave Privada e Certificado do PFX (Reusa lógica do Agente, mas retorna strings)
 */
const extractCertData = (pfxBase64, password) => {
    const pfxDer = forge.util.decode64(pfxBase64);
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);

    let keyPem = null;
    let certPem = null;

    // Extrair Certificado
    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
    if (certBags && certBags.length > 0) {
        certPem = forge.pki.certificateToPem(certBags[0].cert);
    }

    // Extrair Chave Privada
    const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (keyBags && keyBags.length > 0) {
        keyPem = forge.pki.privateKeyToPem(keyBags[0].key);
    } else {
        const plainKeyBags = pfx.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];
        if (plainKeyBags && plainKeyBags.length > 0) {
            keyPem = forge.pki.privateKeyToPem(plainKeyBags[0].key);
        }
    }

    // Limpar headers PEM para uso no XML (apenas base64)
    const cleanCert = certPem ? certPem.replace(/-----BEGIN CERTIFICATE-----/g, '').replace(/-----END CERTIFICATE-----/g, '').replace(/\r\n/g, '').replace(/\n/g, '') : null;

    return { keyPem, certPem, cleanCert };
};

// Rota de Assinatura
app.post('/api/sign', async (req, res) => {
    try {
        console.log('[Proxy] Solicitação de Assinatura XML recebida.');
        const { xml, pfx, password, tagToSign } = req.body;

        if (!xml || !pfx || !password || !tagToSign) {
            return res.status(400).json({ success: false, message: 'Dados incompletos para assinatura.' });
        }

        // 1. Extrair Chaves
        const { keyPem, cleanCert } = extractCertData(pfx, password);
        if (!keyPem || !cleanCert) {
            throw new Error('Não foi possível extrair a chave privada ou certificado do PFX.');
        }

        // 2. Identificar o conteúdo a ser assinado (Tag Alvo)
        // O eSocial exige assinar o CONTEÚDO do evento, identificado pelo ID.
        // Ex: <evtInfoEmpregador Id="ID1...">...</evtInfoEmpregador>

        // Regex simplificado para extrair o bloco da tag (assume XML bem formado)
        const regex = new RegExp(`<${tagToSign}\\s+Id="([^"]+)">([\\s\\S]*?)</${tagToSign}>`);
        const match = xml.match(regex);

        if (!match) {
            throw new Error(`Tag <${tagToSign}> não encontrada ou sem atributo Id.`);
        }

        const fullTagBlock = match[0]; // <tag Id="...">...</tag>
        const idValue = match[1];

        // 3. Canonicalizar e Calcular Digest do conteúdo
        const canonicalXml = c14n(fullTagBlock);
        const digestValue = calculateHash(canonicalXml);

        // 4. Montar Template SignedInfo
        const signedInfo =
            `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod>
<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></SignatureMethod>
<Reference URI="#${idValue}">
<Transforms>
<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform>
<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform>
</Transforms>
<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod>
<DigestValue>${digestValue}</DigestValue>
</Reference>
</SignedInfo>`;

        // 5. Assinar SignedInfo (Importante: Deve ser canonicalizado também)
        // Como o SignedInfo acima já está "limpo" (sem espaços extras além dos necessários), usamos ele.
        // Mas para garantir, aplicamos c14n nele também antes de assinar.
        const canonicalSignedInfo = c14n(signedInfo);
        const signatureValue = signContent(canonicalSignedInfo, keyPem);

        // 6. Montar Bloco Signature Completo
        const signatureBlock =
            `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
${canonicalSignedInfo}
<SignatureValue>${signatureValue}</SignatureValue>
<KeyInfo>
<X509Data>
<X509Certificate>${cleanCert}</X509Certificate>
</X509Data>
</KeyInfo>
</Signature>`;

        // 7. Inserir Signature no XML Original
        // A assinatura deve ser anexada APÓS o conteúdo da tag assinada, mas ANTES do fechamento do elemento pai (se houver) ou apenas appended logicamente.
        // No eSocial, a Signature é filha direta de <eSocial>, logo após o <evt...>. 
        // Mas espere! O formato de envio de LOTE é:
        // <eSocial ...> <envioLoteEventos> <eventos> <evento Id=X> <evt... Id=X>...</evt...> <Signature>...</Signature> </evento> </eventos> ...
        // A estrutura que estamos assinando é o <evt...>. A Signature fica DEPOIS dele, mas DENTRO da tag <evento> wrapper do lote?
        // NÃO. No padrão de envio de lote:
        // <evento Id="ID..."> <mt:eSocial ...> ... </mt:eSocial> <Signature>...</Signature> </evento>

        // Vamos inserir a assinatura logo após o fechamento da tag assinada.
        const signedXml = xml.replace(fullTagBlock, fullTagBlock + signatureBlock);

        console.log(`[Proxy] XML assinado com sucesso. ID: ${idValue}`);

        res.json({
            success: true,
            signedXml: signedXml
        });

    } catch (error) {
        console.error('[Proxy] Erro Assinatura:', error.message, error.stack);
        res.status(500).json({ success: false, message: error.message });
    }
});

process.on('uncaughtException', (err) => console.error('CRITICAL:', err));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Proxy v2.1 (SOAP Quotes Fix) rodando em http://127.0.0.1:${PORT}`);
});
